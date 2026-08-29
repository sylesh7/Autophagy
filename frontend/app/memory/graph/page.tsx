'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../memory.module.css';
import { graph as fetchGraph, MemoryApiError } from '@/lib/api';
import type { GraphNodeType, GraphResponse } from '@/lib/types';
import { layout, neighborsOf, type PositionedNode } from './graph-layout';

const VIEWBOX = '0 0 1220 520';

const NODE_COLOR: Record<GraphNodeType, string> = {
  Entity: 'var(--tm-paper)',
  Claim: 'var(--tm-signal-text)',
  Event: 'var(--tm-color-gray)',
  Evidence: 'var(--tm-paper-muted)',
  Workflow: 'var(--tm-paper)',
  WorkflowStep: 'var(--tm-paper-muted)',
  Gotcha: 'var(--tm-error)',
  Environment: 'var(--tm-color-gray)',
};

const EDGE_STYLE: Record<string, { stroke: string; dash?: string }> = {
  ABOUT: { stroke: 'var(--tm-color-gray-dark)' },
  SUPERSEDES: { stroke: 'var(--tm-paper-muted)', dash: '6 4' },
  CONTRADICTS: { stroke: 'var(--tm-error)' },
  SUPPORTED_BY: { stroke: 'var(--tm-color-gray-dark)', dash: '2 3' },
  CAUSES: { stroke: 'var(--tm-signal-text)' },
  PRECEDES: { stroke: 'var(--tm-color-gray)', dash: '4 4' },
  HAS_STEP: { stroke: 'var(--tm-color-gray-dark)' },
  NEXT: { stroke: 'var(--tm-color-gray-dark)', dash: '3 3' },
  AFFECTS: { stroke: 'var(--tm-error)', dash: '2 3' },
  HAS_WORKFLOW: { stroke: 'var(--tm-color-gray-dark)' },
};

const DIRECTED = new Set(['CAUSES', 'SUPERSEDES', 'PRECEDES', 'NEXT']);

function nodeShape(node: PositionedNode, selected: boolean) {
  const color =
    node.state === 'superseded' ? 'var(--tm-text-muted)' : NODE_COLOR[node.type] ?? 'var(--tm-paper)';
  const stroke = selected ? 'var(--tm-signal-text)' : color;
  const strokeWidth = selected ? 3 : 1.5;
  const dash = node.state === 'superseded' ? '4 3' : undefined;

  switch (node.type) {
    case 'Entity':
      return <circle r={16} fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} />;
    case 'Claim':
      return (
        <rect x={-16} y={-12} width={32} height={24} fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />
      );
    case 'Event':
      return <polygon points="0,-15 15,0 0,15 -15,0" fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} />;
    case 'Evidence':
      return <rect x={-13} y={-13} width={26} height={26} fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="1 3" />;
    case 'Workflow':
      return <rect x={-18} y={-14} width={36} height={28} fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} />;
    case 'WorkflowStep':
      return <circle r={10} fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} />;
    case 'Gotcha':
      return <polygon points="0,-16 16,14 -16,14" fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} />;
    default:
      return <circle r={14} fill="var(--tm-ink)" stroke={stroke} strokeWidth={strokeWidth} />;
  }
}

export default function GraphExplorerPage() {
  const [data, setData] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(60);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGraph(limit)
      .then((g) => {
        if (!cancelled) {
          setData(g);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof MemoryApiError
            ? { code: err.code, message: err.message }
            : { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) },
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const positioned = useMemo(() => (data ? layout(data.nodes) : []), [data]);
  const nodesById = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);
  const selected = selectedId ? nodesById.get(selectedId) : undefined;

  const neighbors = useMemo(() => {
    if (!selected || !data) return [];
    return neighborsOf(selected.id, data.edges).map((n) => ({ ...n, node: nodesById.get(n.otherId) }));
  }, [selected, data, nodesById]);

  const term = search.trim().toLowerCase();
  const visibleNodes = term ? positioned.filter((n) => n.label.toLowerCase().includes(term)) : positioned;
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  return (
    <>
      <div className={styles.pageHeader}>
        <span className={styles.pageKicker}>03 / Memory Graph Explorer</span>
        <h1 className={styles.pageTitle}>HydraDB, made visible.</h1>
        <p className={styles.pageLede}>
          Entities, claims, events, evidence and workflows as a live graph — not a canned diagram.
          Click any node to walk its neighbors.
        </p>
      </div>

      <div className={styles.graphToolbar}>
        <input
          className={styles.input}
          style={{ maxWidth: '22rem' }}
          placeholder="filter nodes by label…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={styles.badgeMuted}>
          {visibleNodes.length} / {positioned.length} nodes · {data?.edges.length ?? 0} edges
        </span>
        <select className={styles.select} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          <option value={30}>30 per label</option>
          <option value={60}>60 per label</option>
          <option value={150}>150 per label</option>
        </select>
        {data?.truncated && <span className={styles.badgeMuted}>truncated — raise the limit to see more</span>}
      </div>

      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span className={styles.bannerTitle}>{error.code}</span>
          <span className={styles.bannerDetail}>{error.message}</span>
        </div>
      )}

      {loading && !data && (
        <div className={styles.skeleton}>
          <span className={styles.progressLabel}>
            <span>●</span> reading the subgraph for this scope…
          </span>
          <div className={styles.skeletonLine} style={{ width: '65%' }} />
        </div>
      )}

      {data && data.nodes.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <p className={styles.bannerDetail}>
            Nothing in this scope yet. Ingest a session and the graph will fill in.
          </p>
        </div>
      )}

      {data && data.nodes.length > 0 && (
        <div className={styles.graphLayout}>
          <div className={styles.graphCanvasWrap}>
            <svg className={styles.graphSvg} viewBox={VIEWBOX} role="img" aria-label="Memory graph">
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="var(--tm-signal-text)" />
                </marker>
              </defs>

              {data.edges.map((edge) => {
                const from = nodesById.get(edge.source);
                const to = nodesById.get(edge.target);
                if (!from || !to || !visibleIds.has(from.id) || !visibleIds.has(to.id)) return null;
                const style = EDGE_STYLE[edge.type] ?? { stroke: 'var(--tm-color-gray-dark)' };
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={style.stroke}
                    strokeWidth={edge.type === 'CONTRADICTS' ? 2 : 1}
                    strokeDasharray={style.dash}
                    markerEnd={DIRECTED.has(edge.type) ? 'url(#arrow)' : undefined}
                  >
                    <title>{edge.type}</title>
                  </line>
                );
              })}

              {visibleNodes.map((node) => (
                <g
                  key={node.id}
                  transform={`translate(${node.x} ${node.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(node.id)}
                >
                  {nodeShape(node, node.id === selectedId)}
                  <text y={30} textAnchor="middle" fontSize="10" fontFamily="var(--tm-font-code)" fill="var(--tm-paper-muted)">
                    {node.label.length > 26 ? `${node.label.slice(0, 24)}…` : node.label}
                  </text>
                </g>
              ))}
            </svg>

            <div className={styles.graphLegend}>
              <div className={styles.legendRow}>
                <span className={styles.legendSwatch} style={{ borderRadius: '50%' }} /> Entity
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendSwatch} style={{ borderColor: 'var(--tm-signal-text)' }} /> Claim (active)
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendSwatch} style={{ borderColor: 'var(--tm-text-muted)', borderStyle: 'dashed' }} /> Claim
                (superseded)
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendSwatch} style={{ borderColor: 'var(--tm-error)' }} /> Gotcha / contradiction
              </div>
              <hr className={styles.divider} />
              <div>— ABOUT · - - SUPERSEDES · → CAUSES</div>
            </div>

            <div className={styles.cypherFooter}>
              MATCH (n:Claim) WHERE n.scopeId = $scopeId RETURN n.id AS id, n.predicate AS predicate,
              n.qualifier AS qualifier, n.value AS value, n.isActive AS isActive LIMIT $limit
            </div>
          </div>

          <div className={styles.sidePanel}>
            {!selected ? (
              <p className={styles.sidePanelEmpty}>
                Search or click a node to inspect its properties and neighbors.
              </p>
            ) : (
              <>
                <div className={styles.cardHeader}>
                  <span className={styles.badge}>{selected.type}</span>
                  {selected.state && (
                    <span className={selected.state === 'active' ? styles.badgeSignal : styles.badgeMuted}>
                      {selected.state}
                    </span>
                  )}
                </div>
                <span className={styles.cardTitle} style={{ fontSize: '1.15rem' }}>
                  {selected.label}
                </span>
                <pre className={styles.codeBlock}>{JSON.stringify(selected.properties, null, 2)}</pre>

                <span className={styles.fieldLabel}>Neighbors ({neighbors.length})</span>
                <div className={styles.neighborList}>
                  {neighbors.map(
                    (n, i) =>
                      n.node && (
                        <button
                          key={`${n.edgeType}-${i}`}
                          type="button"
                          className={styles.chip}
                          onClick={() => setSelectedId(n.node!.id)}
                        >
                          {n.direction === 'out' ? '→' : '←'} {n.edgeType} {n.node.label}
                        </button>
                      ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
