'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../memory.module.css';
import { ingest, MemoryApiError } from '@/lib/api';
import type { IngestResponse, IngestedClaim } from '@/lib/types';

type Role = 'user' | 'assistant' | 'system' | 'tool';

interface DraftMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

type Status = 'empty' | 'submitting' | 'done' | 'error';

// Two sessions that contradict each other — ingesting both in order is the
// clearest demonstration of supersession, so it is the sample offered.
const SAMPLE = {
  sessionId: 'console-demo',
  startedAt: '2026-03-14T09:00:00.000Z',
  messages: [
    'We migrated the API to TypeScript, so TypeScript is my main language for this project now.',
    'That migration happened because our Python service kept hitting type errors in production.',
  ],
};

let msgSeq = 0;
const newId = () => `m-${msgSeq++}`;
const nowIso = () => new Date().toISOString();

export default function IngestSessionsPage() {
  const [sessionId, setSessionId] = useState(SAMPLE.sessionId);
  const [messages, setMessages] = useState<DraftMessage[]>([
    { id: newId(), role: 'user', content: '', timestamp: nowIso() },
  ]);
  const [status, setStatus] = useState<Status>('empty');
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  function loadSample() {
    setSessionId(SAMPLE.sessionId);
    setMessages(
      SAMPLE.messages.map((content, i) => ({
        id: newId(),
        role: 'user' as Role,
        content,
        timestamp: new Date(Date.parse(SAMPLE.startedAt) + i * 60_000).toISOString(),
      })),
    );
    setStatus('empty');
    setResult(null);
    setError(null);
  }

  const addRow = () =>
    setMessages((prev) => [...prev, { id: newId(), role: 'user', content: '', timestamp: nowIso() }]);
  const removeRow = (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id));
  const updateRow = (id: string, patch: Partial<DraftMessage>) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function submit() {
    const filled = messages.filter((m) => m.content.trim().length > 0);
    if (filled.length === 0 || !sessionId.trim()) return;

    setStatus('submitting');
    setResult(null);
    setError(null);

    try {
      const response = await ingest({
        sessionId: sessionId.trim(),
        startedAt: filled[0]!.timestamp,
        source: 'console',
        messages: filled.map((m) => ({ id: m.id, role: m.role, content: m.content.trim(), timestamp: m.timestamp })),
      });
      setResult(response);
      setStatus('done');
    } catch (err) {
      setError(
        err instanceof MemoryApiError
          ? { code: err.code, message: err.message }
          : { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) },
      );
      setStatus('error');
    }
  }

  // Extraction can fail while the session itself is already durable, which the
  // backend reports as accepted with a warning rather than an error.
  const extractionFailed = result?.warnings.some((w) => w.startsWith('extraction failed')) ?? false;

  return (
    <>
      <div className={styles.pageHeader}>
        <span className={styles.pageKicker}>02 / Ingest Sessions</span>
        <h1 className={styles.pageTitle}>Memory comes from somewhere.</h1>
        <p className={styles.pageLede}>
          Paste or build a session, ingest it, and watch structured claims — with supersession and
          provenance — come out the other side.
        </p>
      </div>

      <div className={styles.twoPanel}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Session input</span>
            <button type="button" className="button button--secondary" onClick={loadSample}>
              Load sample session
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="session-id">
              Session id
            </label>
            <input
              id="session-id"
              className={styles.input}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="a stable id — re-ingesting the same id is idempotent"
            />
          </div>

          {messages.map((m) => (
            <div key={m.id} className={styles.messageRow}>
              <select
                className={styles.select}
                value={m.role}
                onChange={(e) => updateRow(m.id, { role: e.target.value as Role })}
              >
                <option value="user">user</option>
                <option value="assistant">assistant</option>
                <option value="system">system</option>
                <option value="tool">tool</option>
              </select>
              <textarea
                className={styles.textarea}
                placeholder="message content…"
                value={m.content}
                onChange={(e) => updateRow(m.id, { content: e.target.value })}
              />
              <div className={styles.messageRowActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => removeRow(m.id)}
                  aria-label="Remove message"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <div className={styles.cardHeader}>
            <button type="button" className="button button--secondary" onClick={addRow}>
              + Add message
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={submit}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Ingesting…' : 'Ingest session'}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Result</span>
            {status === 'done' && (
              <Link href="/memory/ask" className={styles.planLink}>
                Ask about what you just ingested →
              </Link>
            )}
          </div>

          {status === 'empty' && (
            <p className={styles.bannerDetail}>
              No session submitted yet. Load the sample or write your own, then ingest.
            </p>
          )}

          {status === 'submitting' && (
            <div className={styles.field}>
              <span className={styles.progressLabel}>
                <span>●</span> extracting memory…
              </span>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} />
              </div>
              <p className={styles.bannerDetail}>
                Running structured extraction over the session before any claims are written.
              </p>
            </div>
          )}

          {status === 'error' && error && (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              <span className={styles.bannerTitle}>{error.code}</span>
              <span className={styles.bannerDetail}>{error.message}</span>
            </div>
          )}

          {status === 'done' && result && (
            <>
              <dl className={styles.statRow}>
                <div className={styles.statTile}>
                  <dt>Inserted</dt>
                  <dd>{result.inserted}</dd>
                </div>
                <div className={styles.statTile}>
                  <dt>Updated</dt>
                  <dd>{result.updated}</dd>
                </div>
                <div className={styles.statTile}>
                  <dt>Contradictions</dt>
                  <dd>{result.contradictions}</dd>
                </div>
                <div className={styles.statTile}>
                  <dt>Evidence</dt>
                  <dd>{result.evidenceLinked}</dd>
                </div>
              </dl>

              {extractionFailed && (
                <div className={`${styles.banner} ${styles.bannerError}`}>
                  <span className={styles.bannerTitle}>Partial failure</span>
                  <span className={styles.bannerDetail}>
                    The session and messages are already durable — extraction can be retried without
                    resending anything.
                  </span>
                </div>
              )}

              {result.warnings.length > 0 && (
                <ul className={styles.warningList}>
                  {result.warnings.map((w) => (
                    <li key={w} className={styles.warningItem}>
                      ⚠ {w}
                    </li>
                  ))}
                </ul>
              )}

              {result.claims.length > 0 ? (
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Claims written this ingest</span>
                  {result.claims.map((c: IngestedClaim, i) => (
                    <div
                      key={`${c.predicate}-${c.qualifier}-${c.value}-${i}`}
                      className={`${styles.claimCard} ${
                        c.transition === 'SUPERSEDED' ? styles.claimCardSuperseded : styles.claimCardActive
                      }`}
                    >
                      <span className={styles.claimPredicate}>
                        {c.predicate}
                        {c.qualifier ? ` (for ${c.qualifier.replace(/_/g, ' ')})` : ''}
                      </span>
                      <span className={styles.claimValue}>{c.value}</span>
                      <span className={styles.claimMeta}>
                        {c.transition === 'SUPERSEDED' && c.supersededValue
                          ? `replaced “${c.supersededValue}” · `
                          : `${c.transition.toLowerCase()} · `}
                        confidence {c.confidence.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                !extractionFailed && (
                  <p className={styles.bannerDetail}>
                    No claims were extracted from this session — nothing here asserts a durable fact.
                  </p>
                )
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
