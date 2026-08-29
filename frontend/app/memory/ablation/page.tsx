'use client';

import { useState } from 'react';
import styles from '../memory.module.css';
import { ask, MemoryApiError } from '@/lib/api';
import type { AblationMode, ContextResponse } from '@/lib/types';

interface Arm {
  mode: AblationMode;
  label: string;
  blurb: string;
}

// A/B/C/D from evaluation/README.md. Each is a real code path in
// backend/src/context/ablation.ts — nothing here is simulated.
const ARMS: Arm[] = [
  { mode: 'flat', label: 'A · flat retrieval', blurb: 'Recent messages as text. No intent, no compiler, no traversal.' },
  { mode: 'graph-no-intent', label: 'B · graph, untyped', blurb: 'Keyword expansion over the graph. No operation chosen, no predicate filter.' },
  { mode: 'no-gate', label: 'C · compiler, gate open', blurb: 'The full compiler, with the abstention gate forced open.' },
  { mode: 'full', label: 'D · full system', blurb: 'Typed intent, compiled plan, bounded execution, fail-closed gate.' },
];

const QUESTIONS = [
  { q: 'what is my favourite type of cheese?', note: 'never mentioned — the honest answer is "I don’t know"' },
  { q: 'what car do I drive?', note: 'never mentioned' },
  { q: 'what programming language do I prefer?', note: 'answerable — all four should manage this one' },
];

type Cell = { status: 'idle' | 'running' | 'done' | 'error'; response?: ContextResponse; error?: string };

export default function AblationPage() {
  const [question, setQuestion] = useState(QUESTIONS[0]!.q);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [busy, setBusy] = useState(false);

  async function runAll(q: string) {
    const trimmed = q.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setCells(Object.fromEntries(ARMS.map((a) => [a.mode, { status: 'running' as const }])));

    await Promise.all(
      ARMS.map(async (arm) => {
        try {
          const response = await ask(trimmed, { mode: arm.mode });
          setCells((prev) => ({ ...prev, [arm.mode]: { status: 'done', response } }));
        } catch (err) {
          setCells((prev) => ({
            ...prev,
            [arm.mode]: {
              status: 'error',
              error: err instanceof MemoryApiError ? `${err.code}: ${err.message}` : String(err),
            },
          }));
        }
      }),
    );
    setBusy(false);
  }

  const done = ARMS.map((a) => cells[a.mode]).filter((c) => c?.status === 'done');
  const answeredCount = done.filter((c) => c!.response!.answerable).length;
  const allRan = done.length === ARMS.length;
  // The interesting case: the weaker arms answer while the full system refuses.
  const confabulated = allRan && !cells.full?.response?.answerable && answeredCount > 0;

  return (
    <>
      <div className={styles.pageHeader}>
        <span className={styles.pageKicker}>05 / Ablations</span>
        <h1 className={styles.pageTitle}>Does the compiler earn its place?</h1>
        <p className={styles.pageLede}>
          The same question, four configurations, one graph. Anyone can wire an LLM to a graph
          database — this is the screen that shows what the typed intent and the abstention gate
          actually buy.
        </p>
      </div>

      <div className={styles.field} style={{ maxWidth: '52rem' }}>
        <label className={styles.fieldLabel} htmlFor="ablation-q">
          Question
        </label>
        <div className={styles.inputBar} style={{ position: 'static', maxWidth: 'none' }}>
          <input
            id="ablation-q"
            className={styles.textInput}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runAll(question);
            }}
            disabled={busy}
          />
          <button type="button" className="button button--primary" onClick={() => void runAll(question)} disabled={busy}>
            {busy ? 'Running 4…' : 'Run all four'}
          </button>
        </div>
        <div className={styles.evidenceRow}>
          {QUESTIONS.map((s) => (
            <button
              key={s.q}
              type="button"
              className={s.q === question ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => {
                setQuestion(s.q);
                void runAll(s.q);
              }}
            >
              {s.q}
            </button>
          ))}
        </div>
        <p className={styles.bannerDetail}>{QUESTIONS.find((s) => s.q === question)?.note ?? ' '}</p>
      </div>

      {confabulated && (
        <div className={`${styles.banner} ${styles.bannerAbstain}`} style={{ marginBottom: 'var(--tm-space-3)' }}>
          <span className={styles.bannerTitle}>
            {answeredCount} of 4 answered a question with no answer in the history
          </span>
          <span className={styles.bannerDetail}>
            The weaker configurations cannot tell &ldquo;the subject exists&rdquo; from &ldquo;the question is
            answerable&rdquo;, so they return whatever is nearby and let the reader believe it. Only the full
            system refuses, and says which of the two reasons applies.
          </span>
        </div>
      )}

      <div className={styles.twoPanel} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))' }}>
        {ARMS.map((arm) => {
          const cell = cells[arm.mode];
          const r = cell?.response;
          return (
            <div key={arm.mode} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{arm.label}</span>
                {cell?.status === 'done' && r && (
                  <span className={styles.statusPill} data-state={r.answerable ? 'ok' : 'abstain'}>
                    <span className={styles.statusDot}>●</span>
                    {r.answerable ? 'answered' : 'abstained'}
                  </span>
                )}
              </div>

              <p className={styles.bannerDetail}>{arm.blurb}</p>

              {(!cell || cell.status === 'idle') && (
                <p className={styles.sidePanelEmpty}>Not run yet.</p>
              )}

              {cell?.status === 'running' && (
                <div className={styles.skeleton}>
                  <div className={styles.skeletonLine} style={{ width: '70%' }} />
                  <div className={styles.skeletonLine} style={{ width: '45%' }} />
                </div>
              )}

              {cell?.status === 'error' && (
                <div className={`${styles.banner} ${styles.bannerError}`}>
                  <span className={styles.bannerDetail}>{cell.error}</span>
                </div>
              )}

              {cell?.status === 'done' && r && (
                <>
                  <dl className={styles.statRow} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className={styles.statTile}>
                      <dt>Context tokens</dt>
                      <dd>{r.stats.contextTokens}</dd>
                    </div>
                    <div className={styles.statTile}>
                      <dt>Hydra queries</dt>
                      <dd>{r.stats.queriesIssued}</dd>
                    </div>
                  </dl>

                  {r.answerable ? (
                    <pre className={styles.codeBlock} style={{ maxHeight: '13rem', overflow: 'auto' }}>
                      {r.context.slice(0, 700)}
                    </pre>
                  ) : (
                    <div className={`${styles.banner} ${styles.bannerAbstain}`}>
                      <span className={styles.bannerTitle}>{r.abstentionReason}</span>
                      <span className={styles.bannerDetail}>{r.abstentionDetail}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
