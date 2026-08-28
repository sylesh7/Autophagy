import { config } from "../config.js";
import { formatCpu, formatMemory } from "../k8s/quantity.js";
import type { Anomaly, Diagnosis, Proposal, RemediationAction } from "../types.js";
import { HOURS_PER_MONTH, costPerHour, getProfile } from "./pricing.js";

/**
 * Turns a confirmed WASTE verdict into a costed, specific corrective action.
 *
 * The Negotiator never executes anything. It produces the proposal a human
 * reads at the approval gate — so the cost basis is stated explicitly rather
 * than presented as a bare number.
 */

/**
 * What counts as wasted depends on the signature, and the distinction is
 * material to the figure shown:
 *
 * - RETRY_LOOP / DEAD_ALLOCATION: the whole reservation is wasted. The agent
 *   completed no work, so every core-hour it held bought nothing.
 * - ORPHANED_DUPLICATE: the whole reservation of the redundant agent is wasted,
 *   since at most one of the two outputs can ever be used.
 * - SUSTAINED_OVER_ALLOCATION: only the gap between requested and actual is
 *   wasted. The pod is doing real work, just in an oversized reservation.
 */
function wastedResources(anomaly: Anomaly): {
  cpuMilli: number;
  memoryBytes: number;
  basis: string;
} {
  const o = anomaly.latest;
  switch (anomaly.incidentType) {
    case "RETRY_LOOP":
    case "DEAD_ALLOCATION":
      return {
        cpuMilli: o.requestedCpuMilli,
        memoryBytes: o.requestedMemoryBytes,
        basis: "full reservation — the agent produced no completed work in the observed window",
      };
    case "ORPHANED_DUPLICATE":
      return {
        cpuMilli: o.requestedCpuMilli,
        memoryBytes: o.requestedMemoryBytes,
        basis: "full reservation of the redundant agent — only one output can be used",
      };
    case "SUSTAINED_OVER_ALLOCATION":
      return {
        cpuMilli: Math.max(0, o.requestedCpuMilli - (o.actualCpuMilli ?? 0)),
        memoryBytes: Math.max(0, o.requestedMemoryBytes - (o.actualMemoryBytes ?? 0)),
        basis: "the measured gap between requested and actual usage",
      };
  }
}

function chooseAction(anomaly: Anomaly): { action: RemediationAction; why: string } {
  switch (anomaly.incidentType) {
    case "RETRY_LOOP":
      return {
        action: "TERMINATE",
        why:
          "The agent is looping on a task it cannot complete. Restarting the reservation " +
          "stops the burn; the underlying failing dependency needs a human fix regardless.",
      };
    case "DEAD_ALLOCATION":
      return {
        action: "TERMINATE",
        why: "Nothing is running in this reservation. Releasing it reclaims the full allocation.",
      };
    case "ORPHANED_DUPLICATE":
      return {
        action: "REASSIGN",
        why:
          "Two agents hold the same task. Stopping the duplicate leaves the work covered " +
          "while removing the redundant spend.",
      };
    case "SUSTAINED_OVER_ALLOCATION":
      return {
        action: "SCALE_DOWN",
        why:
          "The workload is real but the reservation is oversized. Scaling down keeps the " +
          "service running at a size matching measured demand.",
      };
  }
}

export function negotiate(anomaly: Anomaly, diagnosis: Diagnosis): Proposal {
  const profile = getProfile(config.PRICING_PROFILE);
  const wasted = wastedResources(anomaly);
  const { action, why } = chooseAction(anomaly);

  const wasteUsdPerHour = costPerHour(profile, wasted.cpuMilli, wasted.memoryBytes);
  const observedHours = anomaly.observedForSeconds / 3600;

  const rationale =
    `${why} Cost basis: ${wasted.basis}, priced at ${profile.label} (${profile.region}) ` +
    `rates of $${profile.usdPerVcpuHour}/vCPU-hour and $${profile.usdPerGbHour}/GB-hour. ` +
    `Reclaiming ${formatCpu(wasted.cpuMilli)} and ${formatMemory(wasted.memoryBytes)}. ` +
    `Diagnostician confidence ${(diagnosis.confidence * 100).toFixed(0)}%.`;

  return {
    action,
    target: { podName: anomaly.podName, namespace: anomaly.namespace },
    wasteUsdPerHour: Number(wasteUsdPerHour.toFixed(6)),
    wasteUsdObserved: Number((wasteUsdPerHour * observedHours).toFixed(6)),
    projectedUsdPerMonth: Number((wasteUsdPerHour * HOURS_PER_MONTH).toFixed(2)),
    reclaimedCpuMilli: wasted.cpuMilli,
    reclaimedMemoryBytes: wasted.memoryBytes,
    pricingProfile: `${profile.label} — ${profile.region}`,
    pricingSource: `${profile.source} (rates as of ${profile.asOf})`,
    rationale,
    proposedAt: new Date().toISOString(),
  };
}
