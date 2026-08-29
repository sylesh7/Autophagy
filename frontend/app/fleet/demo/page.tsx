"use client";

import { useEffect, useState } from "react";
import styles from "../fleet.module.css";
import {
  agentName,
  formatPct,
  getWatch,
  INCIDENT_LABEL,
  pollNow,
  subscribe,
  type ClusterSnapshot,
  type Incident,
  type PodObservation,
} from "@/lib/autophagy";

/**
 * The two agents that carry the argument.
 *
 * They are metrically identical — same reservation, same zero utilisation, same
 * empty activity log. The only difference is that one declares its intent. Put
 * side by side, they show why the verdict cannot come from a threshold.
 */
const CONTROL = "standby-agent";
const SUSPECT = "dead-allocation-agent";

function PodPanel({
  pod,
  incident,
  caption,
}: {
  pod: PodObservation | undefined;
  incident: Incident | undefined;
  caption: string;
}) {
  if (!pod) {
    return (
      <section className={styles.card}>
        <div className={styles.emptyState}>
          Waiting for <code>{caption}</code> to appear in the namespace.
        </div>
      </section>
    );
  }

  const standby = pod.annotations["autophagy.io/standby"] === "true";
  const verdict = incident?.diagnosis?.verdict;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{agentName(pod.name)}</h2>
        {verdict ? (
          <span className={verdict === "WASTE" ? styles.badgeSignal : styles.badgeMuted}>
            {verdict} {incident?.diagnosis ? `${(incident.diagnosis.confidence * 100).toFixed(0)}%` : ""}
          </span>
        ) : (
          <span className={styles.badgeMuted}>observing</span>
        )}
      </div>

      <table className={styles.kvTable}>
        <tbody>
          <tr>
            <th>CPU</th>
            <td>{formatPct(pod.cpuUtilisation)} of requested</td>
          </tr>
          <tr>
            <th>Activity</th>
            <td>
              {pod.activity
                ? `${pod.activity.attempts} attempts / ${pod.activity.completions} completions`
                : "no log"}
            </td>
          </tr>
          <tr>
            <th>Declared intent</th>
            <td>
              {standby ? (
                <span className={styles.chip}>standby — reserved capacity</span>
              ) : (
                "none"
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {incident?.diagnosis ? (
        <div className={styles.evidenceCard}>
          <div className={styles.evidenceMeta}>
            {INCIDENT_LABEL[incident.anomaly.incidentType]} · {incident.status.replace(/_/g, " ")}
          </div>
          <p className={styles.evidenceSnippet}>{incident.diagnosis.reasoning}</p>
        </div>
      ) : (
        <div className={styles.sidePanelEmpty}>
          No verdict yet — a pattern must persist several polling windows first.
        </div>
      )}
    </section>
  );
}

export default function LiveDemo() {
  const [snapshot, setSnapshot] = useState<ClusterSnapshot | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWatch().then(setSnapshot).catch((e) => setError(e.message));
    const stop = subscribe(
      setSnapshot,
      (incident) =>
        setIncidents((prev) => [incident, ...prev.filter((i) => i.id !== incident.id)]),
    );
    return stop;
  }, []);

  const find = (needle: string) =>
    snapshot?.observations.find((p) => p.name.startsWith(needle));
  const incidentFor = (needle: string) =>
    incidents.find((i) => i.anomaly.podName.startsWith(needle));

  async function forcePoll() {
    setPolling(true);
    setError(null);
    try {
      const r = await pollNow();
      setSnapshot(r.snapshot);
      setIncidents(r.incidents);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPolling(false);
    }
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div className={styles.pageKicker}>04 — Live Demo</div>
        <h1 className={styles.pageTitle}>Two agents a threshold cannot tell apart</h1>
        <p className={styles.pageLede}>
          Both hold the same reservation, both sit at zero CPU, both log no work. One declares
          itself reserved capacity and one does not. Watch the verdicts diverge.
        </p>
      </header>

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <div className={styles.bannerTitle}>Backend unreachable</div>
          <div className={styles.bannerDetail}>{error}</div>
        </div>
      )}

      <div className={styles.messageRowActions}>
        <button className={styles.iconButton} onClick={forcePoll} disabled={polling}>
          {polling ? "Polling the cluster…" : "Force a polling window now"}
        </button>
        {snapshot && (
          <span className={styles.badgeMuted}>
            last sampled {new Date(snapshot.takenAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className={styles.twoPanel}>
        <PodPanel pod={find(CONTROL)} incident={incidentFor(CONTROL)} caption={CONTROL} />
        <PodPanel pod={find(SUSPECT)} incident={incidentFor(SUSPECT)} caption={SUSPECT} />
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Everything the pipeline has flagged</h2>
        </div>
        {incidents.length === 0 ? (
          <div className={styles.emptyState}>Nothing yet this session.</div>
        ) : (
          <table className={styles.rowTable}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Signature</th>
                <th>Verdict</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td>{agentName(i.anomaly.podName)}</td>
                  <td>{INCIDENT_LABEL[i.anomaly.incidentType]}</td>
                  <td>
                    {i.diagnosis
                      ? `${i.diagnosis.verdict} ${(i.diagnosis.confidence * 100).toFixed(0)}%`
                      : "—"}
                  </td>
                  <td>{i.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
