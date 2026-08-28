import type { Anomaly } from "../types.js";
import { formatCpu, formatMemory } from "../k8s/quantity.js";

export const DIAGNOSTICIAN_SYSTEM_PROMPT = `You are the Diagnostician in Autophagy, a behavioral waste detector for fleets of autonomous agents running on Kubernetes.

A Watcher process polls a real cluster and hands you patterns it has measured. Your job is the judgment call a static threshold cannot make: is this pattern genuine waste, or is there a plausible legitimate explanation?

You will receive:
- The waste signature the Watcher matched, and the measured evidence behind it.
- Mitigations: signals suggesting the allocation may be deliberate.
- The raw utilisation series across consecutive polling windows.

Rules you must follow:

1. Weigh the mitigations honestly. A pod annotated as standby with a stated reason, or one only seconds old, is usually LEGITIMATE even when its utilisation looks bad. Reserved capacity is a real and valid pattern.
2. A retry loop with many attempts and zero completions is the strongest waste signal — an agent burning CPU while producing nothing. Absent a credible mitigation, this is WASTE at high confidence.
3. Two agents working the same task ID concurrently is duplicated spend. Only one output can be used. Treat as WASTE unless the evidence suggests deliberate redundancy.
4. Low utilisation alone, with no other signal, is weak evidence. Prefer LEGITIMATE at low confidence rather than asserting waste you cannot support.
5. Confidence must reflect the actual strength of the evidence. Do not inflate it. A confidence above 0.85 asserts you would be comfortable with a human terminating this workload on your reasoning alone.
6. Your reasoning must cite the specific numbers you were given. A human operator reads it before approving an irreversible action against production infrastructure, and must be able to check your logic against the evidence.

Be decisive but calibrated. A false WASTE verdict destroys legitimate capacity; a missed one costs money quietly.`;

export function buildAnomalyPayload(anomaly: Anomaly): Record<string, unknown> {
  const o = anomaly.latest;
  return {
    signature_matched: anomaly.incidentType,
    pod: {
      name: o.name,
      age_seconds: Math.round(o.ageSeconds),
      phase: o.phase,
      restart_count: o.restartCount,
      labels: o.labels,
      annotations: o.annotations,
    },
    resources: {
      requested_cpu: formatCpu(o.requestedCpuMilli),
      requested_memory: formatMemory(o.requestedMemoryBytes),
      actual_cpu: o.actualCpuMilli === null ? "no sample" : formatCpu(o.actualCpuMilli),
      actual_memory:
        o.actualMemoryBytes === null ? "no sample" : formatMemory(o.actualMemoryBytes),
      cpu_utilisation:
        o.cpuUtilisation === null ? null : Number((o.cpuUtilisation * 100).toFixed(2)),
      memory_utilisation:
        o.memoryUtilisation === null ? null : Number((o.memoryUtilisation * 100).toFixed(2)),
    },
    self_reported_activity: o.activity
      ? {
          attempts: o.activity.attempts,
          completions: o.activity.completions,
          unfinished_task_ids: o.activity.unfinishedTaskIds,
          activity_log_lines_parsed: o.activity.linesParsed,
        }
      : "no activity log available",
    observation: {
      sustained_windows: anomaly.sustainedWindows,
      observed_for_seconds: Math.round(anomaly.observedForSeconds),
      cpu_utilisation_percent_series: anomaly.cpuUtilisationSeries.map((v) =>
        v < 0 ? null : Number((v * 100).toFixed(2)),
      ),
    },
    evidence: anomaly.evidence,
    mitigations: anomaly.mitigations.length ? anomaly.mitigations : ["none found"],
    other_pods_implicated: anomaly.relatedPods,
  };
}

/** Strict schema so the verdict comes back parseable, never as prose. */
export const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["WASTE", "LEGITIMATE"],
      description: "Whether this pattern is genuine resource waste.",
    },
    confidence: {
      type: "number",
      description: "Calibrated confidence in the verdict, 0 to 1.",
    },
    incident_type: {
      type: "string",
      enum: ["RETRY_LOOP", "ORPHANED_DUPLICATE", "DEAD_ALLOCATION", "SUSTAINED_OVER_ALLOCATION"],
      description: "The waste category, which may correct the Watcher's initial match.",
    },
    reasoning: {
      type: "string",
      description:
        "Plain-language justification citing the specific measured numbers. Two to four sentences.",
    },
  },
  required: ["verdict", "confidence", "incident_type", "reasoning"],
  additionalProperties: false,
} as const;
