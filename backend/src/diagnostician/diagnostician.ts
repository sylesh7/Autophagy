import { z } from "zod";
import { llm } from "../config.js";
import { logger } from "../logger.js";
import type { Anomaly, Diagnosis } from "../types.js";
import { DIAGNOSTICIAN_SYSTEM_PROMPT, VERDICT_SCHEMA, buildAnomalyPayload } from "./prompt.js";

const log = logger("diagnostician");

/**
 * The genuinely agentic step: a real model call that decides whether a measured
 * pattern is waste or a legitimate allocation.
 *
 * If the model is unreachable or returns something unparseable, this throws.
 * There is deliberately no heuristic fallback verdict — a verdict that did not
 * come from actual reasoning would be indistinguishable from one that did in
 * the UI, and would quietly turn the demo into theatre.
 */

const verdictSchema = z.object({
  verdict: z.enum(["WASTE", "LEGITIMATE"]),
  confidence: z.number().min(0).max(1),
  incident_type: z.enum([
    "RETRY_LOOP",
    "ORPHANED_DUPLICATE",
    "DEAD_ALLOCATION",
    "SUSTAINED_OVER_ALLOCATION",
  ]),
  reasoning: z.string().min(1),
});

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RATE_LIMIT_RETRIES = 3;

/**
 * How long to wait after a 429.
 *
 * Providers publish this differently: a `retry-after` header in seconds, or —
 * in Groq's case — only inside the message body ("Please try again in 8.33s").
 * Both are far more accurate than a blind backoff, since they reflect the
 * actual token-per-minute budget, so read them before falling back.
 */
function retryDelayMs(response: Response, body: string, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000) + 250;
  }

  const match = /try again in ([\d.]+)s/i.exec(body);
  if (match) return Math.ceil(Number(match[1]) * 1000) + 250;

  return 2 ** attempt * 1000;
}

export async function diagnose(anomaly: Anomaly): Promise<Diagnosis> {
  const payload = buildAnomalyPayload(anomaly);

  for (let attempt = 0; ; attempt++) {
    try {
      return await attemptDiagnosis(payload, anomaly);
    } catch (err) {
      const rateLimited = err instanceof RateLimitError;
      if (!rateLimited || attempt >= MAX_RATE_LIMIT_RETRIES) throw err;

      log.warn(
        `${llm.label} rate-limited; retrying in ${(err.retryAfterMs / 1000).toFixed(1)}s ` +
          `(attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, err.retryAfterMs));
    }
  }
}

/** Signals a 429 that is worth waiting out rather than failing the incident. */
class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

async function attemptDiagnosis(
  payload: Record<string, unknown>,
  anomaly: Anomaly,
): Promise<Diagnosis> {

  const response = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llm.apiKey}`,
      "Content-Type": "application/json",
      // Attribution headers OpenRouter uses for app-level rate limits. xAI
      // ignores them, so they are harmless to send either way.
      "HTTP-Referer": "https://github.com/sylesh7/Autophagy",
      "X-Title": "Autophagy",
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: 0.2,
      // A verdict is a handful of fields and a few sentences of reasoning.
      // Without an explicit cap, some providers (OpenRouter among them) reserve
      // the model's entire context window against the account balance and
      // reject the call with a 402 before any tokens are actually spent.
      max_tokens: llm.maxTokens,
      messages: [
        { role: "system", content: DIAGNOSTICIAN_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload, null, 2) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "waste_verdict", strict: true, schema: VERDICT_SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "(no body)");

    // The reasoning layer is the one dependency with a running cost, so the
    // two ways it fails for billing reasons get named rather than buried in a
    // JSON dump the operator has to decode mid-demo.
    if (response.status === 402) {
      throw new Error(
        `${llm.label} rejected the call for insufficient credits. Autophagy will not ` +
          `fall back to a locally-invented verdict. Add credits at ${llm.creditsUrl}, ` +
          `or set LLM_MODEL to a cheaper model. Provider said: ${detail.slice(0, 300)}`,
      );
    }
    // Providers disagree on the status for "out of credits": OpenRouter uses
    // 402, xAI returns 403 permission-denied. Classify on the message too, so
    // an exhausted balance is never reported as a bad key — that sends the
    // operator to debug the wrong thing.
    if (response.status === 401 || response.status === 403) {
      const outOfCredits = /credit|quota|billing|payment|insufficient/i.test(detail);
      throw new Error(
        outOfCredits
          ? `${llm.label} accepted the key but the account is out of credits. Autophagy ` +
            `will not fall back to a locally-invented verdict. Top up at ${llm.creditsUrl}, ` +
            `or switch LLM_PROVIDER (groq has a free tier). Provider said: ${detail.slice(0, 250)}`
          : `${llm.label} rejected the API key. Check the key for ` +
            `LLM_PROVIDER=${llm.provider} in .env. Provider said: ${detail.slice(0, 250)}`,
      );
    }
    if (response.status === 429) {
      throw new RateLimitError(
        `${llm.label} rate-limited the Diagnostician. Raise WATCH_INTERVAL_MS or switch ` +
          `LLM_MODEL. Provider said: ${detail.slice(0, 300)}`,
        retryDelayMs(response, detail, 0),
      );
    }

    throw new Error(
      `${llm.label} returned ${response.status} ${response.statusText}: ${detail.slice(0, 500)}`,
    );
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
    model?: string;
  };

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`${llm.label} response contained no assistant message content`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error(`Diagnostician returned non-JSON content: ${content.slice(0, 300)}`);
  }

  const parsed = verdictSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Diagnostician verdict failed validation: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const diagnosis: Diagnosis = {
    verdict: parsed.data.verdict,
    confidence: parsed.data.confidence,
    reasoning: parsed.data.reasoning,
    incidentType: parsed.data.incident_type,
    model: body.model ?? llm.model,
    diagnosedAt: new Date().toISOString(),
    tokensUsed: body.usage?.total_tokens ?? null,
  };

  log.info(
    `${anomaly.podName}: ${diagnosis.verdict} @ ${(diagnosis.confidence * 100).toFixed(0)}% ` +
      `(${diagnosis.incidentType}, ${diagnosis.model})`,
  );

  return diagnosis;
}
