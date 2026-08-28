import type { Anomaly, IncidentType, PodObservation } from "../types.js";
import { attemptsPerTask } from "./activity.js";
import { formatCpu, formatMemory } from "../k8s/quantity.js";

/**
 * The detection rule set from README section 4. Deliberately small and
 * inspectable: every anomaly this produces carries the specific measured
 * numbers that triggered it, so the Diagnostician reasons over evidence rather
 * than over a bare score, and any verdict can be traced back to a statable
 * reason.
 *
 * These rules only ever *nominate* a pattern. Nothing here decides waste —
 * that judgment belongs to the Diagnostician, which weighs the mitigations too.
 */

/** Below this fraction of requested CPU, a pod is doing effectively nothing. */
const IDLE_CPU_UTILISATION = 0.05;
/** Below this fraction of requested CPU sustained, allocation looks oversized. */
const OVER_ALLOCATION_CPU_UTILISATION = 0.2;
/** Same task ID attempted at least this many times with no completion. */
const RETRY_ATTEMPT_THRESHOLD = 5;
/** Under this age, low activity is expected rather than suspicious. */
const WARMUP_GRACE_SECONDS = 120;
/** Annotation an operator sets to declare an allocation deliberate. */
const STANDBY_ANNOTATION = "autophagy.io/standby";
/** Annotation naming the reason, surfaced to the Diagnostician verbatim. */
const STANDBY_REASON_ANNOTATION = "autophagy.io/standby-reason";

function pct(value: number | null): string {
  return value === null ? "no metrics sample" : `${(value * 100).toFixed(1)}%`;
}

/** Signals that the allocation may be intentional. Never suppresses a finding. */
function collectMitigations(history: PodObservation[]): string[] {
  const latest = history[history.length - 1]!;
  const mitigations: string[] = [];

  if (latest.annotations[STANDBY_ANNOTATION] === "true") {
    const reason = latest.annotations[STANDBY_REASON_ANNOTATION];
    mitigations.push(
      `Pod carries ${STANDBY_ANNOTATION}=true` +
        (reason ? `, declared reason: "${reason}"` : " with no stated reason"),
    );
  }
  if (latest.ageSeconds < WARMUP_GRACE_SECONDS) {
    mitigations.push(
      `Pod is only ${Math.round(latest.ageSeconds)}s old (under the ${WARMUP_GRACE_SECONDS}s ` +
        `warm-up grace) — low activity may not yet be meaningful`,
    );
  }
  if (latest.restartCount > 0) {
    mitigations.push(
      `Pod has restarted ${latest.restartCount}x — usage history may be truncated by the restart`,
    );
  }
  if (latest.activity && latest.activity.completions > 0) {
    mitigations.push(
      `Agent has completed ${latest.activity.completions} task(s), so it is producing some output`,
    );
  }
  return mitigations;
}

interface Candidate {
  incidentType: IncidentType;
  evidence: string[];
  relatedPods: string[];
}

function detectRetryLoop(history: PodObservation[]): Candidate | null {
  const latest = history[history.length - 1]!;
  if (!latest.activity) return null;

  const worst = attemptsPerTask(latest.activity)[0];
  if (!worst || worst.attempts < RETRY_ATTEMPT_THRESHOLD) return null;
  if (!latest.activity.unfinishedTaskIds.includes(worst.taskId)) return null;

  return {
    incidentType: "RETRY_LOOP",
    evidence: [
      `Task "${worst.taskId}" attempted ${worst.attempts} times with 0 completions`,
      `${latest.activity.attempts} total attempts across ${new Set(latest.activity.taskIds).size} ` +
        `distinct task(s), ${latest.activity.completions} completion(s) overall`,
      `Parsed from ${latest.activity.linesParsed} activity line(s) in the pod's own log`,
      `CPU is being consumed (${pct(latest.cpuUtilisation)} of ${formatCpu(latest.requestedCpuMilli)} ` +
        `requested) while producing no completed work`,
    ],
    relatedPods: [],
  };
}

function detectOrphanedDuplicate(
  history: PodObservation[],
  peers: PodObservation[],
): Candidate | null {
  const latest = history[history.length - 1]!;
  if (!latest.activity || latest.activity.unfinishedTaskIds.length === 0) return null;

  const mine = new Set(latest.activity.unfinishedTaskIds);
  const collisions = new Map<string, string[]>();

  for (const peer of peers) {
    if (peer.uid === latest.uid || !peer.activity) continue;
    for (const taskId of new Set(peer.activity.taskIds)) {
      if (!mine.has(taskId)) continue;
      collisions.set(taskId, [...(collisions.get(taskId) ?? []), peer.name]);
    }
  }
  if (collisions.size === 0) return null;

  const related = [...new Set([...collisions.values()].flat())];
  return {
    incidentType: "ORPHANED_DUPLICATE",
    evidence: [
      `${collisions.size} task ID(s) are being worked concurrently by more than one agent`,
      ...[...collisions.entries()].map(
        ([taskId, pods]) => `Task "${taskId}" also claimed by: ${pods.join(", ")}`,
      ),
      `Both allocations are billed; at most one output can be used`,
    ],
    relatedPods: related,
  };
}

function detectDeadAllocation(history: PodObservation[]): Candidate | null {
  const latest = history[history.length - 1]!;
  const withMetrics = history.filter((h) => h.cpuUtilisation !== null);
  if (withMetrics.length < history.length) return null; // need a full metric record

  const allIdle = withMetrics.every((h) => h.cpuUtilisation! < IDLE_CPU_UTILISATION);
  if (!allIdle) return null;
  if (latest.requestedCpuMilli <= 0 && latest.requestedMemoryBytes <= 0) return null;

  const noActivity = !latest.activity || latest.activity.linesParsed === 0;
  if (!noActivity) return null;

  return {
    incidentType: "DEAD_ALLOCATION",
    evidence: [
      `CPU below ${(IDLE_CPU_UTILISATION * 100).toFixed(0)}% of requested across all ` +
        `${history.length} observed windows (${withMetrics.map((h) => pct(h.cpuUtilisation)).join(", ")})`,
      `Zero task activity reported in the pod's log for the entire observation window`,
      `Holding ${formatCpu(latest.requestedCpuMilli)} CPU and ` +
        `${formatMemory(latest.requestedMemoryBytes)} memory reserved`,
      `Pod has been up for ${Math.round(latest.ageSeconds)}s`,
    ],
    relatedPods: [],
  };
}

function detectOverAllocation(history: PodObservation[]): Candidate | null {
  const withMetrics = history.filter((h) => h.cpuUtilisation !== null);
  if (withMetrics.length < history.length) return null;

  const allLow = withMetrics.every((h) => h.cpuUtilisation! < OVER_ALLOCATION_CPU_UTILISATION);
  if (!allLow) return null;

  const latest = history[history.length - 1]!;
  const peak = Math.max(...withMetrics.map((h) => h.cpuUtilisation!));
  return {
    incidentType: "SUSTAINED_OVER_ALLOCATION",
    evidence: [
      `CPU never exceeded ${pct(peak)} of requested across ${history.length} consecutive windows`,
      `Requested ${formatCpu(latest.requestedCpuMilli)}, peak actual ` +
        `${formatCpu(peak * latest.requestedCpuMilli)}`,
      `Memory at ${pct(latest.memoryUtilisation)} of ` +
        `${formatMemory(latest.requestedMemoryBytes)} requested`,
    ],
    relatedPods: [],
  };
}

/**
 * Evaluate one pod's sustained history. Ordered by specificity — a retry loop
 * is a more precise finding than generic over-allocation, so it wins.
 */
export function evaluate(
  history: PodObservation[],
  peers: PodObservation[],
  requiredWindows: number,
): Anomaly | null {
  if (history.length < requiredWindows) return null;

  const window = history.slice(-requiredWindows);
  const latest = window[window.length - 1]!;
  if (latest.phase !== "Running") return null;

  const candidate =
    detectRetryLoop(window) ??
    detectOrphanedDuplicate(window, peers) ??
    detectDeadAllocation(window) ??
    detectOverAllocation(window);

  if (!candidate) return null;

  const first = window[0]!;
  const observedForSeconds = Math.max(0, latest.ageSeconds - first.ageSeconds);

  return {
    id: `${latest.uid}:${candidate.incidentType}`,
    podName: latest.name,
    podUid: latest.uid,
    namespace: latest.namespace,
    incidentType: candidate.incidentType,
    sustainedWindows: window.length,
    observedForSeconds,
    firstSeenAt: new Date(Date.now() - observedForSeconds * 1000).toISOString(),
    lastSeenAt: new Date().toISOString(),
    evidence: candidate.evidence,
    mitigations: collectMitigations(window),
    latest,
    cpuUtilisationSeries: window.map((h) => h.cpuUtilisation ?? -1),
    memoryUtilisationSeries: window.map((h) => h.memoryUtilisation ?? -1),
    relatedPods: candidate.relatedPods,
  };
}
