import { NextRequest, NextResponse } from "next/server";

/**
 * Thin BFF over the Autophagy backend. It exists so the browser never talks to
 * :8080 directly: no CORS surface has to be opened on the backend, and the
 * upstream address stays server-side and configurable per environment.
 */
const API_BASE = process.env.AUTOPHAGY_API_URL ?? "http://127.0.0.1:8080";

/** First path segment must be one of these. Anything else is refused. */
const ALLOWED = new Set([
  "health",
  "watch",
  "incidents",
  "stats",
  "pods",
  "agents",
  "diagnose",
  "negotiate",
  "approve",
  "reject",
  "events",
]);

function upstreamUrl(req: NextRequest, path: string[]): string {
  return `${API_BASE}/api/${path.join("/")}${req.nextUrl.search}`;
}

function refuse(path: string[]) {
  return NextResponse.json(
    { error: `unknown route: ${path.join("/")}` },
    { status: 404 },
  );
}

function unreachable(err: unknown) {
  // The backend refuses to start unless its cluster and chain dependencies are
  // real, so "connection refused" here almost always means it is not running.
  return NextResponse.json(
    {
      error:
        `Cannot reach the Autophagy backend at ${API_BASE}. Start it with ` +
        `\`npm run dev\` in backend/. (${err instanceof Error ? err.message : String(err)})`,
    },
    { status: 502 },
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!ALLOWED.has(path[0] ?? "")) return refuse(path);

  // The event stream must be piped through rather than buffered, or the client
  // sees nothing until the (never-ending) response completes.
  if (path[0] === "events") {
    try {
      const upstream = await fetch(upstreamUrl(req, path), {
        headers: { accept: "text/event-stream" },
        signal: req.signal,
      });
      if (!upstream.body) return unreachable(new Error("no stream body"));
      return new Response(upstream.body, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "x-accel-buffering": "no",
        },
      });
    } catch (err) {
      return unreachable(err);
    }
  }

  try {
    const upstream = await fetch(upstreamUrl(req, path), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return unreachable(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!ALLOWED.has(path[0] ?? "")) return refuse(path);

  try {
    const upstream = await fetch(upstreamUrl(req, path), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await req.text(),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return unreachable(err);
  }
}
