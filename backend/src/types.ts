/** Every quantity here is measured from the live cluster — none are synthesized. */

export type IncidentType =
  | "RETRY_LOOP"
  | "ORPHANED_DUPLICATE"
  | "DEAD_ALLOCATION"
  | "SUSTAINED_OVER_ALLOCATION";

export type Verdict = "WASTE" | "LEGITIMATE";

export type IncidentStatus =
  | "OBSERVING"      // gap seen, not yet sustained across enough windows
  | "DIAGNOSING"     // handed to the reasoning layer
  | "LEGITIMATE"     // Diagnostician cleared it
  | "AWAITING_APPROVAL" // Negotiator produced a proposal, human gate open
  | "APPROVED"       // human approved; action + attestation executing
  | "REMEDIATED"     // cluster action landed and attestation confirmed
  | "REJECTED"       // human declined
  | "FAILED";        // action or attestation errored

/** Activity an agent reports about itself, parsed from its own stdout. */
export interface AgentActivity {
  attempts: number;
  completions: number;
  /** Task IDs this agent has attempted, most recent last. */
  taskIds: string[];
  /** Distinct task IDs attempted with zero recorded completion. */
  unfinishedTaskIds: string[];
  /** Lines actually parsed — proves the log was read, not assumed. */
  linesParsed: number;
}

/** One pod, one polling window, as measured. */
export interface PodObservation {
  name: string;
  uid: string;
  namespace: string;
  phase: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startedAt: string | null;
  ageSeconds: number;
  /** Sum across containers, in millicores. */
  requestedCpuMilli: number;
  /** Sum across containers, in bytes. */
  requestedMemoryBytes: number;
  /** From metrics-server. null when metrics-server has no sample yet. */
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
}

/** Evidence assembled by the Watcher and handed to the Diagnostician. */
export interface Anomaly {
  id: string;
  podName: string;
  podUid: string;
  namespace: string;
  incidentType: IncidentType;
  /** Consecutive polling windows this pattern has persisted. */
  sustainedWindows: number;
  observedForSeconds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Human-readable, specific, and traceable to measured numbers. */
  evidence: string[];
  /** Signals that may explain the allocation as deliberate. */
  mitigations: string[];
  latest: PodObservation;
  /** Utilisation across the sustained window. */
  cpuUtilisationSeries: number[];
  memoryUtilisationSeries: number[];
  /** Other pods implicated (duplicate task work). */
  relatedPods: string[];
}

export interface Diagnosis {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
  incidentType: IncidentType;
  model: string;
  diagnosedAt: string;
  /** Raw usage accounting from the model call, for cost transparency. */
  tokensUsed: number | null;
}

export type RemediationAction = "SCALE_DOWN" | "TERMINATE" | "REASSIGN";

export interface Proposal {
  action: RemediationAction;
  target: { podName: string; namespace: string };
  /** USD wasted per hour at the measured over-allocation. */
  wasteUsdPerHour: number;
  /** USD already wasted over the observed window. */
  wasteUsdObserved: number;
  /** USD/month if left uncorrected. */
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
  /**
   * Cluster state re-read after the action — proof it actually changed.
   * TERMINATING means the delete was accepted and the pod is shutting down
   * gracefully; that is success, not a pending failure.
   */
  podState: "GONE" | "TERMINATING" | "PRESENT";
  /** True when the action verifiably took effect. */
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
