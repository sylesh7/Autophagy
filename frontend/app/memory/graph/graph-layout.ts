import type { GraphEdge, GraphNode, GraphNodeType } from '@/lib/types';

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

// Deterministic layered layout. The graph arrives from the API without
// coordinates — placement is a presentation concern, so it happens here.
// Columns follow the direction memory actually flows: what a claim is about,
// the claim, what supports it, then the procedural side.
const COLUMN: Record<GraphNodeType, number> = {
  Entity: 0,
  Claim: 1,
  Evidence: 2,
  Event: 1,
  Environment: 3,
  Workflow: 3,
  WorkflowStep: 4,
  Gotcha: 3,
};

const COLUMN_X = [120, 400, 700, 950, 1150];
const TOP = 60;
const BOTTOM = 470;

export function layout(nodes: GraphNode[]): PositionedNode[] {
  const byColumn = new Map<number, GraphNode[]>();

  // Events share a column with claims but are kept below them, so a causal chain
  // reads as its own band rather than tangling with the claim stack.
  const ordered = [...nodes].sort((a, b) => {
    const ca = COLUMN[a.type] ?? 0;
    const cb = COLUMN[b.type] ?? 0;
    if (ca !== cb) return ca - cb;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.label.localeCompare(b.label);
  });

  for (const node of ordered) {
    const col = COLUMN[node.type] ?? 0;
    const bucket = byColumn.get(col);
    if (bucket) bucket.push(node);
    else byColumn.set(col, [node]);
  }

  const positioned: PositionedNode[] = [];
  for (const [col, bucket] of byColumn) {
    const span = BOTTOM - TOP;
    const step = bucket.length > 1 ? span / (bucket.length - 1) : 0;
    bucket.forEach((node, i) => {
      positioned.push({
        ...node,
        x: COLUMN_X[Math.min(col, COLUMN_X.length - 1)]!,
        y: bucket.length === 1 ? TOP + span / 2 : TOP + i * step,
      });
    });
  }
  return positioned;
}

export function neighborsOf(id: string, edges: GraphEdge[]) {
  return edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({
      edgeType: e.type,
      direction: e.source === id ? ('out' as const) : ('in' as const),
      otherId: e.source === id ? e.target : e.source,
    }));
}
