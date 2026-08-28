import { randomUUID } from "node:crypto";
import type {
  Anomaly,
  ChainAttestation,
  ClusterActionResult,
  ClusterSnapshot,
  Diagnosis,
  Incident,
  IncidentStatus,
  Proposal,
} from "../types.js";

/**
 * Process-local state for the current session.
 *
 * Everything held here is derived from real measurements — snapshots come from
 * the live cluster, diagnoses from real model calls, attestations from real
 * transactions. Nothing is seeded, and the store starts empty on every boot:
 * an incident exists only because it was actually observed.
 *
 * The durable record is the chain, not this map. That is the point of the
 * design — a fresh backend can rebuild an agent's efficiency history from
 * EfficiencyRegistry without trusting anything in this process.
 */

const SNAPSHOT_HISTORY = 60;

const incidents = new Map<string, Incident>();
/** anomaly.id -> incident.id, so a recurring pattern updates one incident. */
const byAnomalyKey = new Map<string, string>();
const snapshots: ClusterSnapshot[] = [];

export function recordSnapshot(snapshot: ClusterSnapshot): void {
  snapshots.push(snapshot);
  if (snapshots.length > SNAPSHOT_HISTORY) snapshots.shift();
}

export function latestSnapshot(): ClusterSnapshot | null {
  return snapshots[snapshots.length - 1] ?? null;
}

export function snapshotHistory(): ClusterSnapshot[] {
  return [...snapshots];
}

/** Per-pod utilisation series across retained snapshots, for the detail view. */
export function podSeries(podName: string): Array<{
  takenAt: string;
  cpuUtilisation: number | null;
  memoryUtilisation: number | null;
  actualCpuMilli: number | null;
  requestedCpuMilli: number;
}> {
  const series = [];
  for (const snap of snapshots) {
    const obs = snap.observations.find((o) => o.name === podName);
    if (!obs) continue;
    series.push({
      takenAt: snap.takenAt,
      cpuUtilisation: obs.cpuUtilisation,
      memoryUtilisation: obs.memoryUtilisation,
      actualCpuMilli: obs.actualCpuMilli,
      requestedCpuMilli: obs.requestedCpuMilli,
    });
  }
  return series;
}

/**
 * Upsert by anomaly identity. A pattern that persists across windows refreshes
 * the existing incident rather than spawning a duplicate every poll.
 */
export function upsertAnomaly(anomaly: Anomaly): { incident: Incident; isNew: boolean } {
  const existingId = byAnomalyKey.get(anomaly.id);
  if (existingId) {
    const existing = incidents.get(existingId);
    if (existing) {
      existing.anomaly = anomaly;
      existing.updatedAt = new Date().toISOString();
      return { incident: existing, isNew: false };
    }
  }

  const now = new Date().toISOString();
  const incident: Incident = {
    id: randomUUID(),
    status: "DIAGNOSING",
    anomaly,
    diagnosis: null,
    proposal: null,
    approval: null,
    clusterAction: null,
    attestation: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  incidents.set(incident.id, incident);
  byAnomalyKey.set(anomaly.id, incident.id);
  return { incident, isNew: true };
}

function touch(incident: Incident): Incident {
  incident.updatedAt = new Date().toISOString();
  return incident;
}

export function get(id: string): Incident | null {
  return incidents.get(id) ?? null;
}

export function list(): Incident[] {
  return [...incidents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setStatus(id: string, status: IncidentStatus): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.status = status;
  return touch(incident);
}

export function setDiagnosis(id: string, diagnosis: Diagnosis): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.diagnosis = diagnosis;
  incident.status = diagnosis.verdict === "WASTE" ? "AWAITING_APPROVAL" : "LEGITIMATE";
  return touch(incident);
}

export function setProposal(id: string, proposal: Proposal): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.proposal = proposal;
  incident.status = "AWAITING_APPROVAL";
  return touch(incident);
}

export function setApproval(
  id: string,
  approval: { approvedBy: string; approvedAt: string; note?: string },
): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.approval = approval;
  incident.status = "APPROVED";
  return touch(incident);
}

export function setClusterAction(id: string, action: ClusterActionResult): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.clusterAction = action;
  return touch(incident);
}

export function setAttestation(id: string, attestation: ChainAttestation): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.attestation = attestation;
  incident.status = "REMEDIATED";
  return touch(incident);
}

export function setError(id: string, message: string): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.error = message;
  incident.status = "FAILED";
  return touch(incident);
}

export function reject(id: string, by: string, note?: string): Incident | null {
  const incident = incidents.get(id);
  if (!incident) return null;
  incident.approval = { approvedBy: by, approvedAt: new Date().toISOString(), note };
  incident.status = "REJECTED";
  return touch(incident);
}

/** Session totals for the fleet overview cards. */
export function sessionStats(): {
  flagged: number;
  confirmedWaste: number;
  clearedLegitimate: number;
  awaitingApproval: number;
  remediated: number;
  totalCostImpactUsdPerHour: number;
  totalProjectedUsdPerMonth: number;
} {
  const all = list();
  const confirmed = all.filter((i) => i.diagnosis?.verdict === "WASTE");
  return {
    flagged: all.length,
    confirmedWaste: confirmed.length,
    clearedLegitimate: all.filter((i) => i.status === "LEGITIMATE").length,
    awaitingApproval: all.filter((i) => i.status === "AWAITING_APPROVAL").length,
    remediated: all.filter((i) => i.status === "REMEDIATED").length,
    totalCostImpactUsdPerHour: confirmed.reduce(
      (sum, i) => sum + (i.proposal?.wasteUsdPerHour ?? 0),
      0,
    ),
    totalProjectedUsdPerMonth: confirmed.reduce(
      (sum, i) => sum + (i.proposal?.projectedUsdPerMonth ?? 0),
      0,
    ),
  };
}
