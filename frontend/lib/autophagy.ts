/**
 * Typed client for the Autophagy backend.
 *
 * Calls go through /api/autophagy rather than straight to :8080 — same reason
 * the previous console used a BFF: no CORS surface to open on the backend, and
 * the upstream address stays server-side.
 */

export type IncidentType =
  | "RETRY_LOOP"
  | "ORPHANED_DUPLICATE"
  | "DEAD_ALLOCATION"
  | "SUSTAINED_OVER_ALLOCATION";

export type Verdict = "WASTE" | "LEGITIMATE";

export type IncidentStatus =
  | "OBSERVING"
  | "DIAGNOSING"
  | "LEGITIMATE"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REMEDIATED"
  | "REJECTED"
  | "FAILED";

export interface AgentActivity {
  attempts: number;
  completions: number;
  taskIds: string[];
  unfinishedTaskIds: string[];
  linesParsed: number;
}

export interface PodObservation {
  name: string;
  uid: string;
  namespace: string;
  phase: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startedAt: string | null;
  ageSeconds: number;
  requestedCpuMilli: number;
  requestedMemoryBytes: number;
  /** null when metrics-server has no sample yet — never an estimate. */
  actualCpuMilli: number | null;
  actualMemoryBytes: number | null;
  cpuUtilisation: number | null;
  memoryUtilisation: number | null;
  restartCount: number;
  activity: AgentActivity | null;
}

export interface ClusterSnapshot {
  takenAt: string;
  namespace: string;
  nodeCount: number;
  observations: PodObservation[];
  watchIntervalMs?: number;
  sustainedWindowsRequired?: number;
}

export interface Anomaly {
  id: string;
  podName: string;
  podUid: string;
  namespace: string;
  incidentType: IncidentType;
  sustainedWindows: number;
  observedForSeconds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  evidence: string[];
  mitigations: string[];
  latest: PodObservation;
  cpuUtilisationSeries: number[];
  memoryUtilisationSeries: number[];
  relatedPods: string[];
}

export interface Diagnosis {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  incidentType: IncidentType;
  model: string;
  diagnosedAt: string;
  tokensUsed: number | null;
}

export type RemediationAction = "SCALE_DOWN" | "TERMINATE" | "REASSIGN";

export interface Proposal {
  action: RemediationAction;
  target: { podName: string; namespace: string };
  wasteUsdPerHour: number;
  wasteUsdObserved: number;
  projectedUsdPerMonth: number;
  reclaimedCpuMilli: number;
  reclaimedMemoryBytes: number;
  pricingProfile: string;
  pricingSource: string;
  rationale: string;
  proposedAt: string;
}

export interface ChainAttestation {
  txHash: string;
  blockNumber: number;
  agentId: string;
  explorerUrl: string;
  attestedAt: string;
}

export interface ClusterActionResult {
  action: RemediationAction;
  podName: string;
  executedAt: string;
  podState: "GONE" | "TERMINATING" | "PRESENT";
  verified: boolean;
  detail: string;
}

export interface Incident {
  id: string;
  status: IncidentStatus;
  anomaly: Anomaly;
  diagnosis: Diagnosis | null;
  proposal: Proposal | null;
  approval: { approvedBy: string; approvedAt: string; note?: string } | null;
  clusterAction: ClusterActionResult | null;
  attestation: ChainAttestation | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStats {
  flagged: number;
  confirmedWaste: number;
  clearedLegitimate: number;
  awaitingApproval: number;
  remediated: number;
  totalCostImpactUsdPerHour: number;
  totalProjectedUsdPerMonth: number;
  attestor?: string;
  registry?: string;
}

export interface HealthReport {
  ok: boolean;
  context: string;
  namespace: string;
  cluster: { serverVersion?: string; nodeCount?: number; metricsServerReady?: boolean; error?: string };
  chain: { chainId?: number; signer?: string; balanceEth?: string; registryAddress?: string; totalAgents?: string; error?: string };
  diagnostician: { provider?: string; model?: string; endpoint?: string };
  pricing?: { label?: string; region?: string; source?: string; asOf?: string };
}

export interface OnChainIncident {
  incidentType: string;
  costUsdPerHour: number;
  confidence: number;
  evidenceHash: string;
  timestamp: string;
  attestedBy: string;
}

export interface AgentHistory {
  agentWallet: string;
  agentId: string;
  registered: boolean;
  agentURI: string | null;
  incidents: OnChainIncident[];
  totalCostUsdPerHour: number;
  explorerUrl: string;
}

export class AutophagyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AutophagyApiError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/autophagy/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new AutophagyApiError(
      (body as { error?: string }).error ?? `request failed (${res.status})`,
      res.status,
    );
  }
  return body as T;
}

export const getHealth = () => call<HealthReport>("health");
export const getWatch = (live = false) => call<ClusterSnapshot>(`watch${live ? "?live=true" : ""}`);
export const pollNow = () => call<{ snapshot: ClusterSnapshot; incidents: Incident[] }>("watch/poll", { method: "POST" });
export const getIncidents = () => call<{ incidents: Incident[]; stats: SessionStats }>("incidents");
export const getIncident = (id: string) => call<{ incident: Incident }>(`incidents/${id}`);
export const getStats = () => call<SessionStats>("stats");
export const getPodSeries = (name: string) =>
  call<{ podName: string; series: Array<{ takenAt: string; cpuUtilisation: number | null; memoryUtilisation: number | null; actualCpuMilli: number | null; requestedCpuMilli: number }> }>(
    `pods/${encodeURIComponent(name)}/series`,
  );
export const getAgentHistory = (address: string) => call<AgentHistory>(`agents/${address}/history`);

export const approveIncident = (incidentId: string, approvedBy: string, note?: string) =>
  call<{ incident: Incident }>("approve", {
    method: "POST",
    body: JSON.stringify({ incidentId, approvedBy, note }),
  });

export const rejectIncident = (incidentId: string, approvedBy: string, note?: string) =>
  call<{ incident: Incident }>("reject", {
    method: "POST",
    body: JSON.stringify({ incidentId, approvedBy, note }),
  });

/** Live pipeline stream. Returns an unsubscribe function. */
export function subscribe(
  onSnapshot: (s: ClusterSnapshot) => void,
  onIncident: (i: Incident, stats: SessionStats) => void,
  onError?: () => void,
): () => void {
  const es = new EventSource("/api/autophagy/events");
  es.addEventListener("snapshot", (e) => {
    try {
      onSnapshot(JSON.parse((e as MessageEvent).data));
    } catch {
      /* a malformed frame should not kill the stream */
    }
  });
  es.addEventListener("incident", (e) => {
    try {
      const p = JSON.parse((e as MessageEvent).data);
      if (p.incident) onIncident(p.incident, p.stats);
    } catch {
      /* ignore */
    }
  });
  es.onerror = () => onError?.();
  return () => es.close();
}

// ---------------------------------------------------------------- formatting

export function formatCpu(milli: number): string {
  return milli >= 1000 ? `${(milli / 1000).toFixed(2)} cores` : `${milli.toFixed(0)}m`;
}

export function formatMemory(bytes: number): string {
  if (bytes >= 2 ** 30) return `${(bytes / 2 ** 30).toFixed(2)} GiB`;
  if (bytes >= 2 ** 20) return `${(bytes / 2 ** 20).toFixed(0)} MiB`;
  if (bytes >= 2 ** 10) return `${(bytes / 2 ** 10).toFixed(0)} KiB`;
  return `${bytes} B`;
}

export function formatPct(v: number | null): string {
  return v === null ? "no sample" : `${(v * 100).toFixed(1)}%`;
}

export function agentName(podName: string): string {
  // pods are <deployment>-<replicaset>-<pod>; the deployment is the agent
  return podName.replace(/-[a-z0-9]+-[a-z0-9]{5}$/, "");
}

export const INCIDENT_LABEL: Record<IncidentType, string> = {
  RETRY_LOOP: "Retry loop",
  ORPHANED_DUPLICATE: "Orphaned duplicate",
  DEAD_ALLOCATION: "Dead allocation",
  SUSTAINED_OVER_ALLOCATION: "Sustained over-allocation",
};
