import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { config, llm } from "../config.js";
import { logger } from "../logger.js";
import { assertClusterReachable, currentContext, takeSnapshot } from "../k8s/client.js";
import { assertChainReady, getHistory, signerAddress } from "../chain/registry.js";
import { diagnose } from "../diagnostician/diagnostician.js";
import { negotiate } from "../negotiator/negotiator.js";
import { PRICING_PROFILES } from "../negotiator/pricing.js";
import { approveAndExecute } from "../pipeline/remediate.js";
import * as store from "../store/incidents.js";
import { pipelineEvents, pollOnce } from "../watcher/watcher.js";

const log = logger("api");
export const api = Router();

/** Express 5 forwards rejected promises to the error handler automatically. */

// ---------------------------------------------------------------- health

api.get("/health", async (_req: Request, res: Response) => {
  const [cluster, chain] = await Promise.allSettled([
    assertClusterReachable(),
    assertChainReady(),
  ]);

  const clusterOk = cluster.status === "fulfilled";
  const chainOk = chain.status === "fulfilled";

  res.status(clusterOk && chainOk ? 200 : 503).json({
    ok: clusterOk && chainOk,
    context: currentContext(),
    namespace: config.KUBE_NAMESPACE,
    cluster: clusterOk
      ? cluster.value
      : { error: cluster.reason instanceof Error ? cluster.reason.message : String(cluster.reason) },
    chain: chainOk
      ? chain.value
      : { error: chain.reason instanceof Error ? chain.reason.message : String(chain.reason) },
    diagnostician: { provider: llm.label, model: llm.model, endpoint: llm.baseUrl },
    pricing: PRICING_PROFILES[config.PRICING_PROFILE],
  });
});

// ---------------------------------------------------------------- watch

/**
 * Current cluster snapshot. Returns the most recent polling window by default;
 * `?live=true` forces a fresh read of the cluster and metrics-server.
 */
api.get("/watch", async (req: Request, res: Response) => {
  const wantsLive = req.query.live === "true";
  let snapshot = store.latestSnapshot();

  if (wantsLive || !snapshot) {
    snapshot = await takeSnapshot();
  }

  res.json({
    ...snapshot,
    live: wantsLive || !store.latestSnapshot(),
    watchIntervalMs: config.WATCH_INTERVAL_MS,
    sustainedWindowsRequired: config.SUSTAINED_WINDOWS,
  });
});

/** Force one full pipeline pass. Useful to drive the demo without waiting. */
api.post("/watch/poll", async (_req: Request, res: Response) => {
  const snapshot = await pollOnce();
  res.json({ snapshot, incidents: store.list() });
});

api.get("/pods/:name/series", (req: Request, res: Response) => {
  const name = String(req.params.name);
  res.json({ podName: name, series: store.podSeries(name) });
});

// ---------------------------------------------------------------- diagnose

const incidentRefSchema = z.object({ incidentId: z.string().min(1) });

/**
 * Run the reasoning layer over a flagged anomaly. The watcher calls this
 * automatically; this endpoint exposes it for re-running a verdict by hand.
 */
api.post("/diagnose", async (req: Request, res: Response) => {
  const parsed = incidentRefSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Body must be { incidentId: string }" });
  }

  const incident = store.get(parsed.data.incidentId);
  if (!incident) return res.status(404).json({ error: "Unknown incident" });

  const diagnosis = await diagnose(incident.anomaly);
  store.setDiagnosis(incident.id, diagnosis);
  pipelineEvents.emit("incident", store.get(incident.id));

  res.json({ incident: store.get(incident.id), diagnosis });
});

// ---------------------------------------------------------------- negotiate

api.post("/negotiate", (req: Request, res: Response) => {
  const parsed = incidentRefSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Body must be { incidentId: string }" });
  }

  const incident = store.get(parsed.data.incidentId);
  if (!incident) return res.status(404).json({ error: "Unknown incident" });
  if (!incident.diagnosis) {
    return res.status(409).json({ error: "Incident has not been diagnosed yet" });
  }
  if (incident.diagnosis.verdict !== "WASTE") {
    return res.status(409).json({
      error: `Diagnostician returned ${incident.diagnosis.verdict}; nothing to negotiate`,
    });
  }

  const proposal = negotiate(incident.anomaly, incident.diagnosis);
  store.setProposal(incident.id, proposal);
  pipelineEvents.emit("incident", store.get(incident.id));

  res.json({ incident: store.get(incident.id), proposal });
});

// ---------------------------------------------------------------- approve

const approvalSchema = z.object({
  incidentId: z.string().min(1),
  approvedBy: z.string().min(1),
  note: z.string().optional(),
});

/**
 * The human gate. Executes the real cluster action and commits the on-chain
 * attestation. Nothing here happens without an explicit call.
 */
api.post("/approve", async (req: Request, res: Response) => {
  const parsed = approvalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Body must be { incidentId: string, approvedBy: string, note?: string }",
      issues: parsed.error.issues,
    });
  }

  const { incidentId, approvedBy, note } = parsed.data;
  log.info(`approval received for ${incidentId} from ${approvedBy}`);

  const incident = await approveAndExecute(incidentId, approvedBy, note);
  res.json({ incident });
});

api.post("/reject", (req: Request, res: Response) => {
  const parsed = approvalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Body must include incidentId and approvedBy" });
  }

  const incident = store.reject(parsed.data.incidentId, parsed.data.approvedBy, parsed.data.note);
  if (!incident) return res.status(404).json({ error: "Unknown incident" });

  pipelineEvents.emit("incident", incident);
  res.json({ incident });
});

// ---------------------------------------------------------------- incidents

api.get("/incidents", (_req: Request, res: Response) => {
  res.json({ incidents: store.list(), stats: store.sessionStats() });
});

api.get("/incidents/:id", (req: Request, res: Response) => {
  const incident = store.get(String(req.params.id));
  if (!incident) return res.status(404).json({ error: "Unknown incident" });
  res.json({ incident });
});

api.get("/stats", (_req: Request, res: Response) => {
  res.json({
    ...store.sessionStats(),
    attestor: signerAddress(),
    registry: config.EFFICIENCY_REGISTRY_ADDRESS,
  });
});

// ---------------------------------------------------------------- on-chain

/**
 * An agent's efficiency history, read straight from the contract. `id` is the
 * agent's wallet address — the same record anyone else can query without going
 * through Autophagy at all.
 */
api.get("/agents/:id/history", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!/^0x[a-fA-F0-9]{40}$/.test(id)) {
    return res.status(400).json({ error: "Agent id must be a 20-byte hex address" });
  }

  const history = await getHistory(id);
  res.json({ agentWallet: id, ...history });
});

// ---------------------------------------------------------------- events

/** Server-sent events so the dashboard reflects the pipeline as it happens. */
api.get("/events", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("hello", { namespace: config.KUBE_NAMESPACE, stats: store.sessionStats() });

  const onSnapshot = (snapshot: unknown): void => send("snapshot", snapshot);
  const onIncident = (incident: unknown): void =>
    send("incident", { incident, stats: store.sessionStats() });

  pipelineEvents.on("snapshot", onSnapshot);
  pipelineEvents.on("incident", onIncident);

  // Comment frames keep intermediaries from closing an idle stream.
  const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), 15_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    pipelineEvents.off("snapshot", onSnapshot);
    pipelineEvents.off("incident", onIncident);
  });
});
