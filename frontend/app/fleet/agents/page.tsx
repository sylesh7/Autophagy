"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../fleet.module.css";
import {
  agentName,
  formatCpu,
  formatMemory,
  formatPct,
  getAgentHistory,
  getIncidents,
  getPodSeries,
  getWatch,
  INCIDENT_LABEL,
  type AgentHistory,
  type Incident,
  type PodObservation,
} from "@/lib/autophagy";

const WALLET_ANNOTATION = "autophagy.io/agent-wallet";

/** Requested-vs-actual over the observation window, drawn as inline SVG. */
function UsageChart({ series }: { series: Array<{ cpuUtilisation: number | null }> }) {
  const points = series.filter((s) => s.cpuUtilisation !== null);
  if (points.length < 2) {
    return <div className={styles.emptyState}>Not enough samples yet to plot.</div>;
  }

  const w = 640;
  const h = 160;
  const max = Math.max(1, ...points.map((p) => p.cpuUtilisation!));
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p.cpuUtilisation! / max) * (h - 20) - 10;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // The 100% line is what "requested" means — above it the pod is using more
  // than it reserved, below it the reservation is larger than the work.
  const requestedY = h - (1 / max) * (h - 20) - 10;

  // SVG paints later elements over earlier ones. The data line is drawn first
  // so it can run anywhere in the chart, including straight through the
  // "requested" label's row when utilisation is near 100% — which is exactly
  // what struck the text out in practice. An opaque plate then covers that
  // stretch before the label itself is drawn on top, so the label reads
  // cleanly no matter where the line falls. The plate's fill matches the
  // card background it sits on (--tm-color-black-raised) rather than the
  // page background, since this chart is always rendered inside a .card.
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.graphSvg} role="img" aria-label="CPU utilisation over time">
      <line x1="0" y1={requestedY} x2={w} y2={requestedY} stroke="currentColor" strokeDasharray="4 4" opacity="0.35" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="0" y={requestedY - 15} width="104" height="14" fill="var(--tm-color-black-raised)" />
      <text x="4" y={requestedY - 6} fontSize="10" fill="currentColor" opacity="0.75">
        requested (100%)
      </text>
    </svg>
  );
}

function AgentDetailInner() {
  const params = useSearchParams();
  const podParam = params.get("pod");

  const [pods, setPods] = useState<PodObservation[]>([]);
  const [selected, setSelected] = useState<string | null>(podParam);
  const [series, setSeries] = useState<Array<{ cpuUtilisation: number | null }>>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [history, setHistory] = useState<AgentHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [snap, inc] = await Promise.all([getWatch(), getIncidents()]);
        setPods(snap.observations);
        setIncidents(inc.incidents);
        if (!selected && snap.observations.length) setSelected(snap.observations[0]!.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    // selected is intentionally not a dependency: this only seeds the default
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pod = pods.find((p) => p.name === selected) ?? null;

  useEffect(() => {
    if (!selected) return;
    getPodSeries(selected).then((r) => setSeries(r.series)).catch(() => setSeries([]));
  }, [selected]);

  useEffect(() => {
    const wallet = pod?.annotations[WALLET_ANNOTATION];
    if (!wallet) {
      setHistory(null);
      return;
    }
    getAgentHistory(wallet).then(setHistory).catch(() => setHistory(null));
  }, [pod]);

  const podIncidents = incidents.filter((i) => i.anomaly.podName === selected);

  return (
    <>
      <header className={styles.pageHeader}>
        <div className={styles.pageKicker}>02 — Agent Detail</div>
        <h1 className={styles.pageTitle}>{pod ? agentName(pod.name) : "Agent detail"}</h1>
        <p className={styles.pageLede}>
          Measured usage against what the agent reserved, every verdict passed on it, and the
          public record any other orchestrator can read.
        </p>
      </header>

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <div className={styles.bannerTitle}>Backend unreachable</div>
          <div className={styles.bannerDetail}>{error}</div>
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="agent-select">
          Agent
        </label>
        <select
          id="agent-select"
          className={styles.select}
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {pods.map((p) => (
            <option key={p.uid} value={p.name}>
              {agentName(p.name)}
            </option>
          ))}
        </select>
      </div>

      {pod && (
        <>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Requested vs actual</h2>
              <span className={styles.badgeMuted}>{series.length} samples</span>
            </div>
            <UsageChart series={series} />
            <div className={styles.kvTable}>
              <div className={styles.kvKey}>CPU</div>
              <div className={styles.kvValue}>
                {pod.actualCpuMilli === null ? "no sample" : formatCpu(pod.actualCpuMilli)} of{" "}
                {formatCpu(pod.requestedCpuMilli)} ({formatPct(pod.cpuUtilisation)})
              </div>

              <div className={styles.kvKey}>Memory</div>
              <div className={styles.kvValue}>
                {pod.actualMemoryBytes === null ? "no sample" : formatMemory(pod.actualMemoryBytes)} of{" "}
                {formatMemory(pod.requestedMemoryBytes)} ({formatPct(pod.memoryUtilisation)})
              </div>

              <div className={styles.kvKey}>Activity</div>
              <div className={styles.kvValue}>
                {pod.activity
                  ? `${pod.activity.attempts} attempts, ${pod.activity.completions} completions, ` +
                    `${pod.activity.unfinishedTaskIds.length} unfinished`
                  : "no activity log"}
              </div>

              <div className={styles.kvKey}>Age</div>
              <div className={styles.kvValue}>
                {Math.round(pod.ageSeconds)}s · {pod.restartCount} restarts
              </div>

              {pod.annotations["autophagy.io/standby-reason"] && (
                <>
                  <div className={styles.kvKey}>Declared intent</div>
                  <div className={styles.kvValue}>
                    {pod.annotations["autophagy.io/standby-reason"]}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Reasoning trail</h2>
            </div>
            {podIncidents.length === 0 ? (
              <div className={styles.emptyState}>Nothing flagged against this agent.</div>
            ) : (
              podIncidents.map((i) => (
                <div key={i.id} className={styles.evidenceCard}>
                  <div className={styles.evidenceMeta}>
                    {INCIDENT_LABEL[i.anomaly.incidentType]} · {i.status.replace(/_/g, " ")}
                    {i.diagnosis && ` · ${(i.diagnosis.confidence * 100).toFixed(0)}% confidence`}
                  </div>
                  {i.diagnosis && <p className={styles.evidenceSnippet}>{i.diagnosis.reasoning}</p>}
                  <ul className={styles.warningList}>
                    {i.anomaly.evidence.map((e, n) => (
                      <li key={n} className={styles.warningItem}>
                        {e}
                      </li>
                    ))}
                  </ul>
                  {i.anomaly.mitigations.length > 0 && (
                    <div className={styles.claimMeta}>
                      Mitigations weighed: {i.anomaly.mitigations.join(" · ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>On-chain efficiency history</h2>
              {history?.registered && <span className={styles.badge}>agent #{history.agentId}</span>}
            </div>
            {!pod.annotations[WALLET_ANNOTATION] ? (
              <div className={styles.emptyState}>
                This pod has no <code>{WALLET_ANNOTATION}</code> annotation, so its incidents
                cannot be attributed to an on-chain identity.
              </div>
            ) : !history?.registered ? (
              <div className={styles.emptyState}>
                Not yet registered. An identity is created on the first approved attestation.
              </div>
            ) : (
              <>
                <table className={styles.rowTable}>
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Cost / hr</th>
                      <th>Confidence</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.incidents.map((h, n) => (
                      <tr key={n}>
                        <td>{h.incidentType}</td>
                        <td>${h.costUsdPerHour.toFixed(6)}</td>
                        <td>{h.confidence}%</td>
                        <td>{new Date(h.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <a className={styles.planLink} href={history.explorerUrl} target="_blank" rel="noreferrer">
                  verify on Basescan →
                </a>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}

export default function AgentDetail() {
  return (
    <Suspense fallback={<div className={styles.emptyState}>Loading…</div>}>
      <AgentDetailInner />
    </Suspense>
  );
}
