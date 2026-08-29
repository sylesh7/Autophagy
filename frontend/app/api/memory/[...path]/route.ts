import { NextRequest, NextResponse } from 'next/server';

// Thin BFF over the memory service. Two reasons it exists rather than the browser
// calling :8080 directly:
//   1. no CORS surface to open on the backend
//   2. scope headers are attached here, server-side, so a browser can never choose
//      its own tenant — which is the same rule the backend enforces internally
const API_BASE = process.env.MEMORY_API_URL ?? 'http://127.0.0.1:8080';
const TENANT_ID = process.env.MEMORY_TENANT_ID ?? 'demo';
const USER_ID = process.env.MEMORY_USER_ID ?? 'austin';

const ALLOWED = new Set(['context', 'ingest', 'plan', 'evidence', 'graph']);

async function proxy(req: NextRequest, path: string[], method: 'GET' | 'POST') {
  if (!ALLOWED.has(path[0] ?? '')) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: `unknown route: ${path.join('/')}` } }, { status: 404 });
  }

  const url = `${API_BASE}/v1/memory/${path.join('/')}${req.nextUrl.search}`;
  const body = method === 'POST' ? await req.text() : undefined;

  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': TENANT_ID,
        'x-user-id': USER_ID,
      },
      body,
      cache: 'no-store',
    });

    const text = await upstream.text();
    return new NextResponse(text || '{}', {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    // The backend being down is a system error, never an abstention — the UI
    // shows these differently on purpose.
    return NextResponse.json(
      {
        error: {
          code: 'HYDRA_UNAVAILABLE',
          message: `memory service unreachable at ${API_BASE}: ${err instanceof Error ? err.message : String(err)}`,
        },
      },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path, 'POST');
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path, 'GET');
}
