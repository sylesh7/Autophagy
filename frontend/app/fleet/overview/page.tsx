"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../fleet.module.css";
import {
  agentName,
  formatCpu,
  formatPct,
  getHealth,
  getIncidents,
  getWatch,
  INCIDENT_LABEL,
  subscribe,
  type ClusterSnapshot,
  type HealthReport,
  type Incident,
  type SessionStats,
} from "@/lib/autophagy";

const EMPTY_STATS: SessionStats = {
  flagged: 0,
  confirmedWaste: 0,
  clearedLegitimate: 0,
  awaitingApproval: 0,
  remediated: 0,
  totalCostImpactUsdPerHour: 0,
  totalProjectedUsdPerMonth: 0,
};

function statusTone(status: Incident["status"]): string {
  if (status === "LEGITIMATE") return styles.badgeMuted;
  if (status === "AWAITING_APPROVAL" || status === "FAILED") return styles.badgeSignal;
  return styles.badge;
}

export default function FleetOverview() {
  const [snapshot, setSnapshot] = useState<ClusterSnapshot | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [snap, inc, h] = await Promise.all([getWatch(), getIncidents(), getHealth()]);
        if (!alive) return;
        setSnapshot(snap);
        setIncidents(inc.incidents);
        setStats(inc.stats);
        setHealth(h);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    // The pipeline pushes as it runs, so the page reflects the cluster rather
    // than a figure that was true when it loaded.
    const stop = subscribe(
      (s) => setSnapshot(s),
      (incident, s) => {
        setStats(s);
        setIncidents((prev) => {
          const next = prev.filter((i) => i.id !== incident.id);
          return [incident, ...next];
        });
      },
    );
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const pods = snapshot?.observations ?? [];
  const metricsReady = health?.cluster?.metricsServerReady;

  return (
    <>
      <header className={styles.pageHeader}>
        <div className={styles.pageKicker}>01 — Fleet Overview</div>
        <h1 className={styles.pageTitle}>What the fleet is actually doing</h1>
        <p className={styles.pageLede}>
          Live pod metrics joined to each agent&apos;s own activity log. A pattern must persist{" "}
          {snapshot?.sustainedWindowsRequired ?? 3} consecutive polling windows before it is
          flagged, so one noisy reading can never trigger anything.
        </p>
      </header>

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <div className={styles.bannerTitle}>Backend unreachable</div>
          <div className={styles.bannerDetail}>{error}</div>
        </div>
      )}

      {health && metricsReady === false && (
        <div className={`${styles.banner} ${styles.bannerAbstain}`}>
          <div className={styles.bannerTitle}>metrics-server is not reporting</div>
          <div className={styles.bannerDetail}>
            Actual usage is unavailable, so pods below show no sample rather than an estimate.
          </div>
        </div>
      )}

      <div className={styles.statRow}>
        <div className={styles.statTile}>
          <strong>{pods.length}</strong>
          <span>agents watched</span>
        </div>
        <div className={styles.statTile}>
          <strong>{stats.flagged}</strong>
          <span>patterns flagged</span>
        </div>
        <div className={styles.statTile}>
          <strong>{stats.confirmedWaste}</strong>
          <span>confirmed waste</span>
        </div>
        <div className={styles.statTile}>
          <strong>{stats.clearedLegitimate}</strong>
          <span>cleared legitimate</span>
        </div>
        <div className={styles.statTile}>
          <strong>${stats.totalProjectedUsdPerMonth.toFixed(2)}</strong>
          <span>projected / month</span>
        </div>
      </div>

      <div className={styles.twoPanel}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Agents</h2>
            {snapshot && (
              <span className={styles.badgeMuted}>
                sampled {new Date(snapshot.takenAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {pods.length === 0 ? (
            <div className={styles.emptyState}>
              No pods in the namespace yet. Bring the cluster up with{" "}
              <code>npm run cluster:up</code> in <code>backend/</code>.
            </div>
          ) : (
            <table className={styles.rowTable}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>CPU</th>
                  <th>Requested</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {pods.map((p) => {
                  const idle = p.cpuUtilisation !== null && p.cpuUtilisation < 0.05;
                  const standby = p.annotations["autophagy.io/standby"] === "true";
                  return (
                    <tr key={p.uid}>
                      <td>
                        <Link
                          href={`/fleet/agents?pod=${encodeURIComponent(p.name)}`}
                          className={styles.planLink}
                        >
                          {agentName(p.name)}
                        </Link>
                        {standby && <span className={styles.chip}>standby</span>}
                      </td>
                      <td>
                        <span className={styles.statusDot} />
                        {formatPct(p.cpuUtilisation)}
                        {idle && <span className={styles.badgeMuted}>idle</span>}
                      </td>
                      <td>{formatCpu(p.requestedCpuMilli)}</td>
                      <td>
                        {p.activity
                          ? `${p.activity.attempts} attempted / ${p.activity.completions} done`
                          : "no log"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.sidePanel}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Incident feed</h2>
            {stats.awaitingApproval > 0 && (
              <Link href="/fleet/approve" className={styles.planLink}>
                {stats.awaitingApproval} awaiting approval →
              </Link>
            )}
          </div>

          {incidents.length === 0 ? (
            <div className={styles.sidePanelEmpty}>
              Nothing flagged yet. The Watcher needs a few polling windows before a pattern
              counts as sustained.
            </div>
          ) : (
            <div className={styles.stageList}>
              {incidents.map((i) => (
                <article key={i.id} className={styles.stage}>
                  <div className={styles.stageHeader}>
                    <span className={styles.stageIndex}>
                      {INCIDENT_LABEL[i.anomaly.incidentType]}
                    </span>
                    <span className={statusTone(i.status)}>{i.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className={styles.stageBody}>
                    <strong>{agentName(i.anomaly.podName)}</strong>
                    {i.diagnosis && (
                      <p className={styles.contextText}>
                        {i.diagnosis.verdict} at {(i.diagnosis.confidence * 100).toFixed(0)}% —{" "}
                        {i.diagnosis.reasoning}
                      </p>
                    )}
                    {!i.diagnosis && !i.error && (
                      <p className={styles.contextText}>Reasoning about intent…</p>
                    )}
                    {i.error && <p className={styles.contextText}>{i.error}</p>}
                    {i.proposal && (
                      <div className={styles.claimMeta}>
                        {i.proposal.action} · ${i.proposal.projectedUsdPerMonth.toFixed(2)}/month
                      </div>
                    )}
                    {i.attestation && (
                      <a
                        className={styles.planLink}
                        href={i.attestation.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        attested in block {i.attestation.blockNumber} →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
