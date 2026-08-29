import type {
  AblationMode,
  ApiErrorBody,
  ContextResponse,
  EvidenceDetail,
  IngestMessage,
  IngestResponse,
  PlanResponse,
  GraphResponse,
} from './types';

export class MemoryApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MemoryApiError';
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/memory/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = (body as ApiErrorBody).error;
    throw new MemoryApiError(err?.code ?? 'UNKNOWN', err?.message ?? `request failed (${res.status})`, res.status);
  }
  return body as T;
}

export interface AskOptions {
  explain?: boolean;
  mode?: AblationMode;
}

export function ask(question: string, opts: AskOptions = {}): Promise<ContextResponse> {
  return call<ContextResponse>('context', {
    method: 'POST',
    body: JSON.stringify({ question, explain: opts.explain ?? false, mode: opts.mode ?? 'full' }),
  });
}

export interface IngestInput {
  sessionId: string;
  startedAt: string;
  source?: string;
  messages: IngestMessage[];
}

export function ingest(input: IngestInput): Promise<IngestResponse> {
  return call<IngestResponse>('ingest', {
    method: 'POST',
    body: JSON.stringify({
      session: { id: input.sessionId, startedAt: input.startedAt, source: input.source ?? 'console' },
      messages: input.messages,
    }),
  });
}

/** Compile a question without executing it. */
export function compilePlan(question: string): Promise<PlanResponse> {
  return call<PlanResponse>('plan', { method: 'POST', body: JSON.stringify({ question }) });
}

export function graph(limit = 60): Promise<GraphResponse> {
  return call<GraphResponse>(`graph?limit=${limit}`);
}

export function evidenceDetail(id: string): Promise<EvidenceDetail> {
  return call<EvidenceDetail>(`evidence/${encodeURIComponent(id)}`);
}
