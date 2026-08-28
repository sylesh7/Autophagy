import "dotenv/config";
import { z } from "zod";

/**
 * Autophagy runs against real infrastructure only. Every external dependency
 * (cluster, model endpoint, chain) is validated at boot and the process refuses
 * to start if one is missing, rather than degrading to synthetic data. A demo
 * that silently invents metrics is worse than one that fails loudly.
 */
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),

  // Cluster
  KUBE_CONTEXT: z.string().min(1).default("minikube"),
  KUBE_NAMESPACE: z.string().min(1).default("autophagy"),
  WATCH_INTERVAL_MS: z.coerce.number().int().min(2000).default(10000),
  // How many consecutive polling windows a gap must persist before it is an
  // anomaly. Guards against a single noisy metrics-server reading.
  SUSTAINED_WINDOWS: z.coerce.number().int().min(2).default(3),

  // Reasoning layer.
  //
  // xAI and OpenRouter both expose an OpenAI-compatible /chat/completions
  // endpoint with json_schema structured output, so switching providers is
  // configuration rather than code. Each provider supplies its own defaults;
  // LLM_MODEL and LLM_BASE_URL override them when set.
  LLM_PROVIDER: z.enum(["groq", "xai", "openrouter"]).default("groq"),
  GROQ_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().min(1).optional(),
  LLM_BASE_URL: z.string().url().optional(),
  // Caps the completion. A verdict needs only a few hundred tokens, and an
  // uncapped request makes OpenRouter reserve the model's whole context window
  // against the account balance.
  DIAGNOSTICIAN_MAX_TOKENS: z.coerce.number().int().min(200).default(700),

  // Chain
  BASE_SEPOLIA_RPC_URL: z.string().url().default("https://sepolia.base.org"),
  BASE_SEPOLIA_CHAIN_ID: z.coerce.number().int().default(84532),
  EFFICIENCY_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "EFFICIENCY_REGISTRY_ADDRESS must be a 20-byte hex address"),
  // Wallet exports vary on whether they include the 0x prefix, so accept both
  // and normalise. ethers requires the prefix, and a key that is correct but
  // unprefixed is a frustrating thing to be rejected for.
  BACKEND_SIGNER_PRIVATE_KEY: z
    .string()
    .transform((key) => (key.startsWith("0x") ? key : `0x${key}`))
    .refine(
      (key) => /^0x[a-fA-F0-9]{64}$/.test(key),
      "BACKEND_SIGNER_PRIVATE_KEY must be a 32-byte hex key (64 hex chars, 0x prefix optional)",
    ),
  BLOCK_EXPLORER_URL: z.string().url().default("https://sepolia.basescan.org"),

  // Cost model
  PRICING_PROFILE: z.enum(["aws-fargate", "gcp-autopilot"]).default("aws-fargate"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(
    `\nAutophagy cannot start — configuration is incomplete:\n${issues}\n\n` +
      `Copy .env.example to .env and fill in the real values. Autophagy does not\n` +
      `fall back to simulated data when a dependency is unavailable.\n`,
  );
  process.exit(1);
}

/** Per-provider defaults. All are OpenAI-compatible chat-completions APIs. */
const PROVIDERS = {
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    // Groq's free tier needs no card. Only three models support constrained
    // decoding with strict: true, which the verdict schema depends on:
    // openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b.
    // Anything else returns prose and fails validation.
    model: "openai/gpt-oss-120b",
    keyVar: "GROQ_API_KEY",
    creditsUrl: "https://console.groq.com/keys",
  },
  xai: {
    label: "xAI",
    baseUrl: "https://api.x.ai/v1",
    // Cheapest current general-purpose tier ($1.25/$2.50 per M tokens). A
    // verdict is ~1.5k tokens, so each one costs well under a cent. Valid ids
    // are grok-4.6 / 4.5 / 4.3 and the grok-4.20-* variants — there is no
    // "fast" variant despite what some third-party pricing pages list.
    model: "grok-4.3",
    keyVar: "XAI_API_KEY",
    creditsUrl: "https://console.x.ai",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-sonnet-4.5",
    keyVar: "OPENROUTER_API_KEY",
    creditsUrl: "https://openrouter.ai/settings/credits",
  },
} as const;

const provider = PROVIDERS[parsed.data.LLM_PROVIDER];
const API_KEYS: Record<typeof parsed.data.LLM_PROVIDER, string | undefined> = {
  groq: parsed.data.GROQ_API_KEY,
  xai: parsed.data.XAI_API_KEY,
  openrouter: parsed.data.OPENROUTER_API_KEY,
};
const apiKey = API_KEYS[parsed.data.LLM_PROVIDER];

if (!apiKey) {
  console.error(
    `\nAutophagy cannot start — LLM_PROVIDER is "${parsed.data.LLM_PROVIDER}" ` +
      `(${provider.label}) but ${provider.keyVar} is not set.\n\n` +
      `Set ${provider.keyVar} in .env, or switch LLM_PROVIDER to ` +
      `${Object.keys(PROVIDERS)
        .filter((p) => p !== parsed.data.LLM_PROVIDER)
        .join(" / ")}.\n`,
  );
  process.exit(1);
}

/** Resolved reasoning-layer settings, provider differences already applied. */
export const llm = {
  provider: parsed.data.LLM_PROVIDER,
  label: provider.label,
  apiKey,
  baseUrl: parsed.data.LLM_BASE_URL ?? provider.baseUrl,
  model: parsed.data.LLM_MODEL ?? provider.model,
  creditsUrl: provider.creditsUrl,
  maxTokens: parsed.data.DIAGNOSTICIAN_MAX_TOKENS,
};

export const config = parsed.data;
export type Config = typeof config;
