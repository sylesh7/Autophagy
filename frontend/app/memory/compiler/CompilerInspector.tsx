'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../memory.module.css';
import { ask, compilePlan, MemoryApiError } from '@/lib/api';
import type { ContextResponse, PlanResponse } from '@/lib/types';

const SUGGESTED = [
  'what programming language do I prefer?',
  'how do I deploy the billing service?',
  'why did the migration happen?',
  'who is the president of France?',
];

type Phase = 'idle' | 'compiling' | 'compiled' | 'running' | 'ran' | 'error';

function Stage({
  index,
  title,
  defaultOpen = true,
  children,
}: {
  index: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.stage}>
      <button type="button" className={styles.stageHeader} onClick={() => setOpen((o) => !o)}>
        <span>
          <span className={styles.stageIndex}>{index}</span>
          {title}
        </span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className={styles.stageBody}>{children}</div>}
    </div>
  );
}

function highlightCypher(cypher: string) {
  return cypher
    .split(/(\$[a-zA-Z0-9]+|MATCH|WHERE|RETURN|ORDER BY|LIMIT|CALL|YIELD|MERGE|UNWIND|AND|OR)/g)
    .map((token, i) => {
      if (token.startsWith('$'))
        return (
          <span key={i} className="param-hl" style={{ color: 'var(--tm-paper)' }}>
            {token}
          </span>
        );
      if (/^(MATCH|WHERE|RETURN|ORDER BY|LIMIT|CALL|YIELD|MERGE|UNWIND|AND|OR)$/.test(token))
        return (
          <span key={i} style={{ color: 'var(--tm-signal-text)' }}>
            {token}
          </span>
        );
      return <span key={i}>{token}</span>;
    });
}

export default function CompilerInspector() {
  const params = useSearchParams();
  const initial = params.get('q');

  const [draft, setDraft] = useState(initial ?? SUGGESTED[0]!);
  const [phase, setPhase] = useState<Phase>('idle');
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [run, setRun] = useState<ContextResponse | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const fail = (err: unknown) => {
    setError(
      err instanceof MemoryApiError
        ? { code: err.code, message: err.message }
        : { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) },
    );
    setPhase('error');
  };

  const compile = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return;
    setPhase('compiling');
    setPlan(null);
    setRun(null);
    setError(null);
    try {
      setPlan(await compilePlan(q));
      setPhase('compiled');
    } catch (err) {
      fail(err);
    }
  }, []);

  // A question arriving from the Ask page compiles on load.
  useEffect(() => {
    if (initial) void compile(initial);
  }, [initial, compile]);

  async function execute() {
    setPhase('running');
    try {
      const response = await ask(draft.trim(), { explain: true });
      setRun(response);
      setPhase('ran');
    } catch (err) {
      fail(err);
    }
  }

  const intent = plan?.intent;
  const steps = run?.explain?.steps ?? plan?.plan.steps.map((s) => ({ ...s, rows: 0, sample: [] as Record<string, unknown>[], failed: undefined })) ?? [];
  const resolution = run?.explain?.resolution ?? plan?.plan.resolution;
  const totalRows = run?.explain?.steps.reduce((n, s) => n + s.rows, 0) ?? 0;

  return (
    <>
      <div className={styles.field} style={{ maxWidth: '52rem' }}>
        <label className={styles.fieldLabel} htmlFor="compiler-q">
          Question
        </label>
        <div className={styles.inputBar} style={{ position: 'static', maxWidth: 'none' }}>
          <input
            id="compiler-q"
            className={styles.textInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void compile(draft);
            }}
          />
          <button
            type="button"
            className="button button--primary"
            onClick={() => void compile(draft)}
            disabled={phase === 'compiling' || phase === 'running'}
          >
            {phase === 'compiling' ? 'Compiling…' : 'Compile'}
          </button>
        </div>
        <div className={styles.evidenceRow}>
          {SUGGESTED.map((q) => (
            <button
              key={q}
              type="button"
              className={q === draft ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => {
                setDraft(q);
                void compile(q);
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {phase === 'error' && error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span className={styles.bannerTitle}>{error.code}</span>
          <span className={styles.bannerDetail}>{error.message}</span>
        </div>
      )}

      {phase === 'compiling' && (
        <div className={styles.skeleton}>
          <span className={styles.progressLabel}>
            <span>●</span> extracting intent and compiling a plan…
          </span>
          <div className={styles.skeletonLine} style={{ width: '60%' }} />
          <div className={styles.skeletonLine} style={{ width: '40%' }} />
        </div>
      )}

      {plan && intent && (
        <div className={styles.stageList}>
          <Stage index="1" title="MemoryIntent — produced by the LLM, and nothing else">
            <dl className={styles.kvTable}>
              <dt>operation</dt>
              <dd>{intent.operation}</dd>
              <dt>target.queryText</dt>
              <dd>{intent.target.queryText}</dd>
              <dt>target.entityHints</dt>
              <dd>[{intent.target.entityHints.join(', ') || '—'}]</dd>
              <dt>target.predicateHints</dt>
              <dd>[{intent.target.predicateHints.join(', ') || '—'}]</dd>
              <dt>target.qualifierHints</dt>
              <dd>[{intent.target.qualifierHints.join(', ') || '—'}]</dd>
              <dt>target.selfReference</dt>
              <dd>{String(intent.target.selfReference)}</dd>
              <dt>time.mode</dt>
              <dd>{intent.time?.mode ?? 'current'}</dd>
              <dt>evidencePolicy</dt>
              <dd>{intent.evidencePolicy}</dd>
              <dt>intentHash</dt>
              <dd>{plan.intentHash.slice(0, 24)}…</dd>
            </dl>
          </Stage>

          <Stage index="2" title="RetrievalPlan — written by the compiler, not the model">
            <dl className={styles.kvTable} style={{ marginBottom: 'var(--tm-space-2)' }}>
              <dt>resolution.kind</dt>
              <dd>{resolution?.kind}</dd>
              <dt>resolution.via</dt>
              <dd>{resolution?.via}</dd>
              {resolution?.canonicalName && (
                <>
                  <dt>resolved to</dt>
                  <dd>{resolution.canonicalName}</dd>
                </>
              )}
              <dt>steps</dt>
              <dd>{steps.length}</dd>
              <dt>budget.maxQueries</dt>
              <dd>{plan.plan.budget.maxQueries}</dd>
            </dl>

            {steps.length === 0 ? (
              <div className={`${styles.banner} ${styles.bannerAbstain}`}>
                <span className={styles.bannerTitle}>Empty step list</span>
                <span className={styles.bannerDetail}>
                  Nothing in scope matched — the plan compiled to zero steps. That is correct compiler
                  behaviour, not an error, and the gate reads it as MEMORY_ANCHOR_UNRESOLVED.
                </span>
              </div>
            ) : (
              steps.map((step) => (
                <div key={step.id} className={styles.stepRow}>
                  <div className={styles.stepRowHeader}>
                    <span className={styles.stepId}>
                      {step.id}
                      {plan.plan.primaryStepId === step.id ? ' ★' : ''}
                    </span>
                    <span className={step.optional ? styles.badgeMuted : styles.badge}>
                      {step.optional ? 'optional' : 'required'}
                    </span>
                  </div>
                  <pre className={styles.codeBlock}>{highlightCypher(step.cypher)}</pre>
                  <dl className={styles.kvTable}>
                    {Object.entries(step.params).map(([k, v]) => (
                      <Fragment key={k}>
                        <dt>${k}</dt>
                        <dd>→ {String(v)}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </div>
              ))
            )}
          </Stage>

          <Stage index="3" title="Execution against HydraDB" defaultOpen={phase === 'ran'}>
            {phase !== 'ran' && phase !== 'running' && (
              <>
                <p className={styles.bannerDetail}>
                  Compiled but not executed. Nothing has touched the graph yet.
                </p>
                {steps.length > 0 && (
                  <button type="button" className="button button--primary" onClick={() => void execute()}>
                    Run it
                  </button>
                )}
              </>
            )}
            {phase === 'running' && (
              <span className={styles.progressLabel}>
                <span>●</span> executing plan against HydraDB…
              </span>
            )}
            {phase === 'ran' && run && (
              <>
                <dl className={styles.statRow}>
                  <div className={styles.statTile}>
                    <dt>Rows returned</dt>
                    <dd>{totalRows}</dd>
                  </div>
                  <div className={styles.statTile}>
                    <dt>Hydra queries</dt>
                    <dd>{run.stats.queriesIssued}</dd>
                  </div>
                  <div className={styles.statTile}>
                    <dt>Retrieval</dt>
                    <dd style={{ fontSize: '1.25rem' }}>{run.stats.retrievalMs}ms</dd>
                  </div>
                  <div className={styles.statTile}>
                    <dt>Context tokens</dt>
                    <dd>{run.stats.contextTokens}</dd>
                  </div>
                </dl>

                {run.explain?.steps.map((step) =>
                  step.failed ? (
                    <div key={step.id} className={`${styles.banner} ${styles.bannerError}`}>
                      <span className={styles.bannerTitle}>{step.id} failed</span>
                      <span className={styles.bannerDetail}>{step.failed}</span>
                    </div>
                  ) : step.sample.length > 0 ? (
                    <div key={step.id} className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {step.id} — {step.rows} row(s)
                        {step.rows > step.sample.length ? `, showing ${step.sample.length}` : ''}
                      </span>
                      <div style={{ overflowX: 'auto' }}>
                        <table className={styles.rowTable}>
                          <thead>
                            <tr>
                              {Object.keys(step.sample[0]!).map((col) => (
                                <th key={col}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {step.sample.map((row, i) => (
                              <tr key={i}>
                                {Object.keys(step.sample[0]!).map((col) => (
                                  <td key={col}>{row[col] === undefined ? '—' : String(row[col])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p key={step.id} className={styles.bannerDetail}>
                      {step.id} — 0 rows
                    </p>
                  ),
                )}
              </>
            )}
          </Stage>

          <Stage index="4" title="Abstention decision" defaultOpen={phase === 'ran' || steps.length === 0}>
            {phase !== 'ran' ? (
              <p className={styles.bannerDetail}>The gate runs after execution.</p>
            ) : (
              run && (
                <>
                  <div className={styles.cardHeader}>
                    <span className={styles.statusPill} data-state={run.answerable ? 'ok' : 'abstain'}>
                      <span className={styles.statusDot}>●</span>
                      answerable: {String(run.answerable)}
                    </span>
                    <span className={styles.badge}>via {run.stats.resolutionVia}</span>
                  </div>
                  {!run.answerable && (
                    <div className={`${styles.banner} ${styles.bannerAbstain}`}>
                      <span className={styles.bannerTitle}>{run.abstentionReason}</span>
                      <span className={styles.bannerDetail}>{run.abstentionDetail}</span>
                    </div>
                  )}
                  {run.answerable && <p className={styles.contextText}>{run.context}</p>}
                </>
              )
            )}
          </Stage>
        </div>
      )}
    </>
  );
}
