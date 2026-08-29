// Mirrors backend/src/contracts/*.ts. Kept as plain types rather than importing
// across the workspace so the frontend builds standalone.

export type MemoryOperation =
  | 'CURRENT_STATE'
  | 'HISTORICAL_STATE'
  | 'STATE_DIFF'
  | 'TIMELINE'
  | 'CAUSE_TRACE'
  | 'CONTRADICTION_CHECK'
  | 'WORKFLOW_RECALL'
  | 'PREMISE_CHECK'
  | 'MULTI_SESSION_SYNTHESIS'
  | 'ABSTAIN_CHECK';

export type AbstentionReason =
  | 'MEMORY_ANCHOR_UNRESOLVED'
  | 'MEMORY_EVIDENCE_INSUFFICIENT'
  | 'MEMORY_CONTRADICTION_UNRESOLVED';

export type ResolutionVia = 'self' | 'alias' | 'exact' | 'prefix' | 'predicate' | 'none';

export type AblationMode = 'full' | 'flat' | 'graph-no-intent' | 'no-gate';

export interface EvidenceItem {
  id: string;
  sourceType: string;
  sourceKey: string;
  snippet: string;
  timestampMs?: number;
  score?: number;
  reasons: string[];
}

export interface ExecutedStep {
  id: string;
  cypher: string;
  params: Record<string, unknown>;
  optional: boolean;
  rows: number;
  sample: Record<string, unknown>[];
  failed?: string;
}

export interface ResolutionOutcome {
  kind: 'entity' | 'predicate' | 'unresolved';
  via: ResolutionVia;
  entityId?: number;
  entityKey?: string;
  canonicalName?: string;
  predicatePrefix?: string;
  qualifier?: string;
}

export interface Explain {
  intent: {
    version: '1';
    operation: MemoryOperation;
    target: {
      queryText: string;
      entityHints: string[];
      predicateHints: string[];
      qualifierHints: string[];
      selfReference: boolean;
    };
    time?: { mode: string; from?: string; to?: string };
    constraints: { maxDepth: number; maxEvidence: number; maxTokens: number; timeoutMs: number };
    evidencePolicy: 'required' | 'preferred' | 'optional';
  };
  intentHash: string;
  resolution: ResolutionOutcome;
  budget: { maxDepth: number; maxEvidence: number; maxTokens: number; maxQueries: number; timeoutMs: number };
  primaryStepId?: string;
  steps: ExecutedStep[];
}

export interface RetrievalPlan {
  planVersion: '1';
  operation: MemoryOperation;
  intentHash: string;
  primaryStepId?: string;
  steps: { id: string; cypher: string; params: Record<string, unknown>; optional: boolean }[];
  budget: { maxDepth: number; maxEvidence: number; maxTokens: number; maxQueries: number; timeoutMs: number };
  evidencePolicy: 'required' | 'preferred' | 'optional';
  resolution: ResolutionOutcome;
}

export interface PlanResponse {
  intent: Explain['intent'];
  plan: RetrievalPlan;
  intentHash: string;
}

export interface ContextResponse {
  requestId: string;
  operation: MemoryOperation | 'FLAT_RETRIEVAL';
  answerable: boolean;
  abstentionReason?: AbstentionReason;
  abstentionDetail?: string;
  context: string;
  evidence: EvidenceItem[];
  stats: {
    queriesIssued: number;
    nodesVisited: number;
    retrievalMs: number;
    contextTokens: number;
    resolutionVia: ResolutionVia;
  };
  warnings: string[];
  explain?: Explain;
}

export interface IngestMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
}

export interface IngestedClaim {
  predicate: string;
  qualifier: string;
  value: string;
  transition: 'NEW' | 'CONFIRMED' | 'SUPERSEDED';
  confidence: number;
  supersededValue?: string;
}

export interface IngestResponse {
  sessionId: string;
  accepted: boolean;
  inserted: number;
  updated: number;
  confirmed: number;
  contradictions: number;
  evidenceLinked: number;
  claims: IngestedClaim[];
  warnings: string[];
}

export interface EvidenceDetail {
  id: string;
  sourceType: 'message' | 'session';
  sourceKey: string;
  span: string;
  content: string;
  contentHash: string;
  timestampMs?: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId?: string; details?: Record<string, unknown> };
}

export type GraphNodeType =
  | 'Entity'
  | 'Claim'
  | 'Event'
  | 'Evidence'
  | 'Workflow'
  | 'WorkflowStep'
  | 'Gotcha'
  | 'Environment';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  state?: 'active' | 'superseded';
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface GraphResponse {
  scopeId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  counts: Record<string, number>;
  truncated: boolean;
}
