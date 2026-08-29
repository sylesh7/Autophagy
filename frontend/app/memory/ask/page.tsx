'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../memory.module.css';
import { ask, MemoryApiError } from '@/lib/api';
import type { ContextResponse } from '@/lib/types';

interface Turn {
  id: string;
  question: string;
  status: 'loading' | 'done' | 'error';
  response?: ContextResponse;
  error?: { code: string; message: string };
}

const STARTERS = [
  'what programming language do I prefer?',
  'where do I work?',
  'how do I deploy the billing service?',
  'what is my favourite type of cheese?',
  'who is the president of France?',
];

let turnSeq = 0;

const operationLabel = (op: string) => op.replace(/_/g, ' ');

export default function AskMemoryPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const lastDone = [...turns].reverse().find((t) => t.status === 'done');
  const lastStats = lastDone?.response?.stats;

  async function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    const id = `turn-${turnSeq++}`;
    setDraft('');
    setBusy(true);
    setTurns((prev) => [...prev, { id, question: trimmed, status: 'loading' }]);

    try {
      const response = await ask(trimmed, { explain: true });
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'done', response } : t)));
    } catch (err) {
      const error =
        err instanceof MemoryApiError
          ? { code: err.code, message: err.message }
          : { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) };
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'error', error } : t)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <span className={styles.pageKicker}>01 / Ask Memory</span>
        <h1 className={styles.pageTitle}>Ask what&apos;s true now.</h1>
        <p className={styles.pageLede}>
          A question goes in, an operation gets picked, and evidence-backed context — or an honest
          abstention — comes back. Nothing here is a black box.
        </p>
      </div>

      {lastStats && (
        <dl className={styles.statRow}>
          <div className={styles.statTile}>
            <dt>Last operation</dt>
            <dd style={{ fontSize: '1.25rem' }}>{operationLabel(lastDone?.response?.operation ?? '')}</dd>
          </div>
          <div className={styles.statTile}>
            <dt>Hydra queries</dt>
            <dd>{lastStats.queriesIssued}</dd>
          </div>
          <div className={styles.statTile}>
            <dt>Retrieval</dt>
            <dd style={{ fontSize: '1.25rem' }}>{lastStats.retrievalMs}ms</dd>
          </div>
          <div className={styles.statTile}>
            <dt>Context tokens</dt>
            <dd>{lastStats.contextTokens}</dd>
          </div>
        </dl>
      )}

      {turns.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.bannerDetail}>No questions asked yet this session. Try one:</p>
          <div className={styles.evidenceRow}>
            {STARTERS.map((q) => (
              <button key={q} type="button" className={styles.chip} onClick={() => submit(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.chatList}>
          {turns.map((turn) => (
            <TurnView key={turn.id} turn={turn} />
          ))}
        </div>
      )}

      <form
        className={styles.inputBar}
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <input
          className={styles.textInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about anything ingested into this scope…"
          disabled={busy}
        />
        <button type="submit" className="button button--primary" disabled={busy || !draft.trim()}>
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>
    </>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const r = turn.response;

  return (
    <>
      <div className={styles.turnUser}>{turn.question}</div>

      {turn.status === 'loading' && (
        <div className={styles.skeleton}>
          <span className={styles.statusPill} data-state="ok">
            <span className={styles.statusDot}>●</span> resolving anchor, compiling plan…
          </span>
          <div className={styles.skeletonLine} style={{ width: '70%' }} />
          <div className={styles.skeletonLine} style={{ width: '45%' }} />
        </div>
      )}

      {turn.status === 'error' && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span className={styles.bannerTitle}>{turn.error?.code ?? 'ERROR'}</span>
          <span className={styles.bannerDetail}>
            {turn.error?.message} — this is a system error, not an abstention. Distinct treatment on
            purpose.
          </span>
        </div>
      )}

      {turn.status === 'done' && r && (
        <div className={styles.turnSystem}>
          <div className={styles.cardHeader}>
            <span className={styles.badge}>{operationLabel(r.operation)}</span>
            <span className={styles.statusPill} data-state={r.answerable ? 'ok' : 'abstain'}>
              <span className={styles.statusDot}>●</span>
              {r.answerable ? 'answerable' : 'abstained'}
            </span>
            <span className={styles.badge}>via {r.stats.resolutionVia}</span>
          </div>

          {r.answerable ? (
            <>
              <p className={styles.contextText}>{r.context}</p>
              {r.evidence.length > 0 && (
                <div className={styles.evidenceRow}>
                  {r.evidence.map((ev) => (
                    <div key={ev.id} className={styles.evidenceCard}>
                      <div className={styles.evidenceMeta}>
                        <span>
                          {ev.sourceType}:{ev.sourceKey}
                        </span>
                        <span>{ev.score?.toFixed(2)}</span>
                      </div>
                      <p className={styles.evidenceSnippet}>{ev.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={`${styles.banner} ${styles.bannerAbstain}`}>
              <span className={styles.bannerTitle}>{r.abstentionReason}</span>
              <span className={styles.bannerDetail}>{r.abstentionDetail}</span>
            </div>
          )}

          {r.warnings.length > 0 && (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              <span className={styles.bannerTitle}>warnings</span>
              <span className={styles.bannerDetail}>{r.warnings.join(' · ')}</span>
            </div>
          )}

          <Link href={`/memory/compiler?q=${encodeURIComponent(turn.question)}`} className={styles.planLink}>
            View compiled plan →
          </Link>
        </div>
      )}
    </>
  );
}
