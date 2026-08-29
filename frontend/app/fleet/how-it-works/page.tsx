import styles from "../fleet.module.css";

const SIGNATURES = [
  ["Retry loop", "Same task ID attempted five or more times with zero completions."],
  ["Orphaned duplicate", "Two agents holding the same unfinished task ID concurrently."],
  ["Dead allocation", "CPU under 5% of the reservation for the whole window, and no task activity at all."],
  ["Sustained over-allocation", "CPU never exceeding 20% of the reservation across the window."],
];

const STAGES = [
  [
    "01",
    "Watcher",
    "Polls the live Kubernetes API and metrics-server, and reads each agent's own stdout for task attempts and completions. A pod with no metrics sample reports null — never an estimate.",
  ],
  [
    "02",
    "Diagnostician",
    "Weighs the measured evidence against any declared intent and returns a verdict, a calibrated confidence, and its reasoning in plain language. If the model is unreachable the incident is marked failed rather than downgraded to a guess.",
  ],
  [
    "03",
    "Negotiator",
    "Prices the waste against published cloud rates and proposes one specific corrective action. The cost basis differs by signature: a retry loop wastes its whole reservation, an oversized pod only the measured gap.",
  ],
  [
    "04",
    "Approval gate",
    "A person reads the reasoning and the cost, then approves. Only then does the cluster action run and the attestation get written — together.",
  ],
  [
    "05",
    "Efficiency registry",
    "The confirmed incident is committed to Base Sepolia with a hash of its evidence, so an agent's record is checkable by anyone without trusting this dashboard.",
  ],
];

export default function HowItWorks() {
  return (
    <>
      <header className={styles.pageHeader}>
        <div className={styles.pageKicker}>05 — How It Works</div>
        <h1 className={styles.pageTitle}>Why a budget cap misses this</h1>
        <p className={styles.pageLede}>
          A spending limit only ever asks how much was spent. An agent retrying a failing task
          forever, two agents duplicating the same work, or a pod nobody remembered to tear down
          all sit comfortably under that limit while producing nothing.
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>The pipeline</h2>
        </div>
        <div className={styles.stageList}>
          {STAGES.map(([index, title, body]) => (
            <article key={index} className={styles.stage}>
              <div className={styles.stageHeader}>
                <span className={styles.stageIndex}>{index}</span>
                <strong>{title}</strong>
              </div>
              <div className={styles.stageBody}>
                <p className={styles.contextText}>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>What counts as a pattern</h2>
          <span className={styles.badgeMuted}>3 consecutive windows required</span>
        </div>
        <table className={styles.rowTable}>
          <thead>
            <tr>
              <th>Signature</th>
              <th>Fires when</th>
            </tr>
          </thead>
          <tbody>
            {SIGNATURES.map(([name, when]) => (
              <tr key={name}>
                <td>
                  <strong>{name}</strong>
                </td>
                <td>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.contextText}>
          These rules only ever nominate a pattern and attach the measured evidence alongside any
          mitigating signal. They never decide waste — that judgment belongs to the Diagnostician,
          which is the point of putting reasoning in the loop at all.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Why the record is public</h2>
        </div>
        <p className={styles.contextText}>
          Existing cost tooling treats waste as a private, single-organisation concern. Nothing
          makes an agent&apos;s efficiency record portable, so the next team to run it starts from
          zero information every time. Autophagy attests each human-approved finding on a public
          testnet against the agent&apos;s own identity, following the pattern of ERC-8004&apos;s
          identity and validation registries.
        </p>
        <p className={styles.contextText}>
          It deliberately does not claim conformance with that standard — ERC-8004&apos;s identity
          registry is ERC-721 based and its validation registry models a request/response handshake
          with an independent validator. Autophagy has a single attesting authority and no
          validation request phase, so implementing those interfaces literally would misrepresent
          what it does.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Honest limits</h2>
        </div>
        <ul className={styles.warningList}>
          <li className={styles.warningItem}>
            Session state lives in memory. Restarting the backend clears the incident feed — the
            durable record is the chain, which a fresh backend can read back.
          </li>
          <li className={styles.warningItem}>
            The rule set is deliberately small and inspectable rather than exhaustive. It catches a
            few well-defined signatures; it does not claim general coverage.
          </li>
          <li className={styles.warningItem}>
            Attestation requires the agent to declare an address. Without one the incident fails
            rather than attaching a permanent public record to a guessed identity.
          </li>
        </ul>
      </section>
    </>
  );
}
