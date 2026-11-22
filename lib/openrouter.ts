// OpenRouter-specific request tweaks.
//
// Some models (including the default Claude Haiku) reason by default on
// OpenRouter. Reasoning tokens share the max_tokens budget, and the AI SDK's
// OpenAI-compatible provider does not stream them, so a reasoning-heavy reply
// can end with finish_reason "length" and no visible text. We set the effort
// explicitly on every request. Default "none": this task is formatting and
// plain-language writing, not multi-step problem solving.

export const REASONING_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/** "default" means: send nothing and let the model use its own default. */
export type ReasoningSetting = ReasoningEffort | "default";

export function parseReasoningSetting(value: string | undefined): ReasoningSetting {
  const v = value?.trim().toLowerCase();
  if (v === "default") return "default";
  return (REASONING_EFFORTS as readonly string[]).includes(v ?? "") ? (v as ReasoningEffort) : "none";
}

/** Adds `reasoning: { effort }` to a JSON chat-completions body. Non-JSON bodies pass through unchanged. */
export function withReasoning(body: string, setting: ReasoningSetting): string {
  if (setting === "default") return body;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return body;
    return JSON.stringify({ ...parsed, reasoning: { effort: setting } });
  } catch {
    return body;
  }
}

/** fetch wrapper for createOpenAI({ fetch }) that applies withReasoning to POST bodies. */
export function createOpenRouterFetch(setting: ReasoningSetting, baseFetch: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    if (init?.method === "POST" && typeof init.body === "string") {
      return baseFetch(input, { ...init, body: withReasoning(init.body, setting) });
    }
    return baseFetch(input, init);
  };
}
