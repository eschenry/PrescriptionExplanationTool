import { parseReasoningSetting } from "./openrouter";

// Server-side configuration. Only import this from route handlers.
// Nothing here is NEXT_PUBLIC_, so Next.js never bundles it for the browser.

export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";
export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

type Env = Record<string, string | undefined>;

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function present(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getConfig(env: Env = process.env) {
  return {
    apiKey: present(env.OPENROUTER_API_KEY) ? env.OPENROUTER_API_KEY!.trim() : undefined,
    model: present(env.OPENROUTER_MODEL) ? env.OPENROUTER_MODEL!.trim() : DEFAULT_MODEL,
    baseURL: present(env.OPENROUTER_BASE_URL) ? env.OPENROUTER_BASE_URL!.trim() : DEFAULT_BASE_URL,
    reasoning: parseReasoningSetting(env.OPENROUTER_REASONING_EFFORT),
    rateLimitMax: positiveInt(env.RATE_LIMIT_MAX, 10),
    rateLimitWindowMs: positiveInt(env.RATE_LIMIT_WINDOW_MS, 60_000),
    siteUrl: env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000",
  };
}

/** Booleans only. Never put a value in here. */
export function healthStatus(env: Env = process.env) {
  return {
    status: "ok" as const,
    openrouterKeyConfigured: present(env.OPENROUTER_API_KEY),
    modelConfigured: present(env.OPENROUTER_MODEL),
  };
}
