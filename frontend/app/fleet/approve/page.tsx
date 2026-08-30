"use client";

import { useEffect, useState } from "react";
import styles from "../fleet.module.css";
import {
  agentName,
  approveIncident,
  formatCpu,
  formatMemory,
  getIncidents,
  INCIDENT_LABEL,
  rejectIncident,
  subscribe,
  type Incident,
} from "@/lib/autophagy";

export default function ApproveReview() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [approver, setApprover] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    getIncidents()
      .then((r) => setIncidents(r.incidents))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    refresh();
    const stop = subscribe(
      () => {},
      (incident) =>
        setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== incident.id)]),
    );
    return stop;
  }, []);

  const pending = incidents.filter((i) => i.status === "AWAITING_APPROVAL");
  const settled = incidents.filter((i) =>
    ["REMEDIATED", "REJECTED", "FAILED"].includes(i.status),
  );

  async function act(id: string, approve: boolean) {
    if (!approver.trim()) {
      setError("Enter who is approving — the name is recorded with the decision.");
      return;
    }
    setBusy(id);
    setError(null);
    try {
      const fn = approve ? approveIncident : rejectIncident;
      const { incident } = await fn(id, approver.trim(), note.trim() || undefined);
      setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== id)]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div className={styles.pageKicker}>03 — Approve / Review</div>
        <h1 className={styles.pageTitle}>The human gate</h1>
        <p className={styles.pageLede}>
          Nothing executes on its own. Approving runs the real cluster action and writes the
          attestation together — both are irreversible, so the reasoning and the measured cost
          are shown in full first.
        </p>
      </header>

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <div className={styles.bannerTitle}>Could not complete</div>
          <div className={styles.bannerDetail}>{error}</div>
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Approving as</h2>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="approver">
            Name — recorded with the decision
          </label>
          <input
            id="approver"
            className={styles.input}
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            placeholder="your name"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="note">
            Note (optional)
          </label>
          <input
            id="note"
            className={styles.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="what you checked before approving"
          />
        </div>
      </section>

      <h2 className={styles.cardTitle}>Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className={styles.emptyState}>
          Nothing awaiting approval. Confirmed waste appears here once the Diagnostician returns a
          WASTE verdict and the Negotiator has priced it.
        </div>
      ) : (
        pending.map((i) => (
          <section key={i.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                {agentName(i.anomaly.podName)} — {INCIDENT_LABEL[i.anomaly.incidentType]}
              </h3>
              {i.diagnosis && (
                <span className={styles.badgeSignal}>
                  {(i.diagnosis.confidence * 100).toFixed(0)}% confidence
                </span>
              )}
            </div>

            {i.diagnosis && <p className={styles.contextText}>{i.diagnosis.reasoning}</p>}

            <ul className={styles.warningList}>
              {i.anomaly.evidence.map((e, n) => (
                <li key={n} className={styles.warningItem}>
                  {e}
                </li>
              ))}
            </ul>

            {i.anomaly.mitigations.length > 0 && (
              <div className={styles.claimMeta}>
                Weighed against: {i.anomaly.mitigations.join(" · ")}
              </div>
            )}

            {i.proposal && (
              <div className={styles.kvTable}>
                <div className={styles.kvKey}>Proposed action</div>
                <div className={styles.kvValue}>
                  <strong>{i.proposal.action}</strong> on {i.proposal.target.podName}
                </div>

                <div className={styles.kvKey}>Reclaims</div>
                <div className={styles.kvValue}>
                  {formatCpu(i.proposal.reclaimedCpuMilli)} ·{" "}
                  {formatMemory(i.proposal.reclaimedMemoryBytes)}
                </div>

                <div className={styles.kvKey}>Cost impact</div>
                <div className={styles.kvValue}>
                  ${i.proposal.wasteUsdPerHour.toFixed(6)}/hr ·{" "}
                  <strong>${i.proposal.projectedUsdPerMonth.toFixed(2)}/month</strong>
                </div>

                <div className={styles.kvKey}>Priced against</div>
                <div className={styles.kvValue}>{i.proposal.pricingSource}</div>

                <div className={styles.kvKey}>Rationale</div>
                <div className={styles.kvValue}>{i.proposal.rationale}</div>
              </div>
            )}

            <div className={styles.messageRowActions}>
              <button
                className={styles.iconButton}
                disabled={busy === i.id}
                onClick={() => act(i.id, true)}
              >
                {busy === i.id ? "Executing…" : "Approve — run action + attest"}
              </button>
              <button
                className={styles.iconButton}
                disabled={busy === i.id}
                onClick={() => act(i.id, false)}
              >
                Reject
              </button>
            </div>
          </section>
        ))
      )}

      {settled.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Settled</h2>
          </div>
          <table className={styles.rowTable}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Outcome</th>
                <th>Cluster</th>
                <th>Attestation</th>
              </tr>
            </thead>
            <tbody>
              {settled.map((i) => (
                <tr key={i.id}>
                  <td>{agentName(i.anomaly.podName)}</td>
                  <td>{i.status.replace(/_/g, " ")}</td>
                  <td>{i.clusterAction ? i.clusterAction.podState : "—"}</td>
                  <td>
                    {i.attestation ? (
                      <a
                        className={styles.planLink}
                        href={i.attestation.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        block {i.attestation.blockNumber} →
                      </a>
                    ) : (
                      i.error ?? "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
