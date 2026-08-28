import { EventEmitter } from "node:events";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { takeSnapshot } from "../k8s/client.js";
import { diagnose } from "../diagnostician/diagnostician.js";
import { negotiate } from "../negotiator/negotiator.js";
import * as store from "../store/incidents.js";
import type { ClusterSnapshot, Incident, PodObservation } from "../types.js";
import { evaluate } from "./signatures.js";

const log = logger("watcher");

/** Live pipeline events, consumed by the dashboard over SSE. */
export const pipelineEvents = new EventEmitter();

/**
 * Rolling per-pod observation history, keyed by pod UID rather than name so a
 * recreated pod starts a fresh history instead of inheriting its predecessor's.
 */
const history = new Map<string, PodObservation[]>();
const HISTORY_DEPTH = 20;

/** Anomalies already pushed through the reasoning pipeline this session. */
const diagnosed = new Set<string>();
/** Guards against a slow poll overlapping the next tick. */
let polling = false;
let timer: NodeJS.Timeout | null = null;

function retainHistory(snapshot: ClusterSnapshot): void {
  const liveUids = new Set(snapshot.observations.map((o) => o.uid));
  for (const uid of history.keys()) {
    if (!liveUids.has(uid)) history.delete(uid);
  }
  for (const obs of snapshot.observations) {
    const series = history.get(obs.uid) ?? [];
    series.push(obs);
    if (series.length > HISTORY_DEPTH) series.shift();
    history.set(obs.uid, series);
  }
}

/**
 * Run one anomaly through Diagnostician then Negotiator.
 *
 * Failures are recorded on the incident rather than swallowed: if the reasoning
 * layer is unreachable the incident is visibly FAILED, never quietly downgraded
 * to a locally-invented verdict.
 */
async function runPipeline(incident: Incident): Promise<void> {
  try {
    store.setStatus(incident.id, "DIAGNOSING");
    pipelineEvents.emit("incident", store.get(incident.id));

    const diagnosis = await diagnose(incident.anomaly);
    store.setDiagnosis(incident.id, diagnosis);
    pipelineEvents.emit("incident", store.get(incident.id));

    if (diagnosis.verdict !== "WASTE") {
      log.info(
        `${incident.anomaly.podName}: cleared as LEGITIMATE ` +
          `(${(diagnosis.confidence * 100).toFixed(0)}%)`,
      );
      return;
    }

    const proposal = negotiate(incident.anomaly, diagnosis);
    store.setProposal(incident.id, proposal);
    pipelineEvents.emit("incident", store.get(incident.id));

    log.info(
      `${incident.anomaly.podName}: awaiting human approval — ${proposal.action}, ` +
        `$${proposal.projectedUsdPerMonth}/month at stake`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`pipeline failed for ${incident.anomaly.podName}: ${message}`);
    store.setError(incident.id, message);
    pipelineEvents.emit("incident", store.get(incident.id));
  }
}

/** One real polling window against the live cluster. */
export async function pollOnce(): Promise<ClusterSnapshot> {
  const snapshot = await takeSnapshot();
  store.recordSnapshot(snapshot);
  retainHistory(snapshot);
  pipelineEvents.emit("snapshot", snapshot);

  const peers = snapshot.observations;
  const pending: Array<Incident> = [];

  for (const obs of snapshot.observations) {
    const series = history.get(obs.uid);
    if (!series) continue;

    const anomaly = evaluate(series, peers, config.SUSTAINED_WINDOWS);
    if (!anomaly) continue;

    const { incident, isNew } = store.upsertAnomaly(anomaly);

    // Diagnose each distinct pattern once. Re-running every poll would burn
    // tokens re-deciding a question already answered, and would let a later
    // call silently overwrite a verdict a human is currently reviewing.
    if (isNew || !diagnosed.has(anomaly.id)) {
      diagnosed.add(anomaly.id);
      log.info(
        `anomaly: ${anomaly.podName} matched ${anomaly.incidentType} across ` +
          `${anomaly.sustainedWindows} windows`,
      );
      pending.push(incident);
    }
  }

  /**
   * Diagnose one at a time rather than as a burst.
   *
   * Providers meter tokens per minute, and a fleet-wide scan can flag several
   * agents in the same window — firing them concurrently spends the whole
   * budget at once and rate-limits calls that would otherwise have succeeded.
   * Sequential runs pace naturally against the quota, and a flagged pattern is
   * not so urgent that seconds matter.
   */
  for (const incident of pending) {
    await runPipeline(incident);
  }

  return snapshot;
}

export function startWatcher(): void {
  if (timer) return;

  const tick = async (): Promise<void> => {
    if (polling) {
      log.warn("previous poll still running, skipping this tick");
      return;
    }
    polling = true;
    try {
      await pollOnce();
    } catch (err) {
      log.error("poll failed", err instanceof Error ? err.message : err);
    } finally {
      polling = false;
    }
  };

  log.info(
    `watching namespace "${config.KUBE_NAMESPACE}" every ${config.WATCH_INTERVAL_MS}ms ` +
      `(a pattern must persist ${config.SUSTAINED_WINDOWS} consecutive windows to flag)`,
  );
  void tick();
  timer = setInterval(() => void tick(), config.WATCH_INTERVAL_MS);
}

export function stopWatcher(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Exposed so a single pod's history is inspectable from the API. */
export function historyFor(podUid: string): PodObservation[] {
  return history.get(podUid) ?? [];
}
