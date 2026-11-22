// Error codes shown to users. The user only ever sees the code and the
// generic sentence; the real error goes to the server log.
// This file is imported by the client too, so keep it free of server-only code.

export const ERROR_CODES = ["AI-400", "AI-401", "AI-429", "AI-500", "AI-502", "AI-503", "AI-504"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const USER_MESSAGES: Record<ErrorCode, string> = {
  "AI-400": "That request could not be processed. Check the prescription text and try again.",
  "AI-401": "The AI service rejected our credentials. Please tell the site owner.",
  "AI-429": "Too many requests. Please wait a minute and try again.",
  "AI-500": "Something went wrong on our side. Please try again.",
  "AI-502": "The AI service returned an error. Please try again in a moment.",
  "AI-503": "The service is not configured yet. Please tell the site owner.",
  "AI-504": "The AI service took too long to respond. Please try again.",
};

export const HTTP_STATUS: Record<ErrorCode, number> = {
  "AI-400": 400,
  "AI-401": 502, // our upstream credentials failed; not the user's auth
  "AI-429": 429,
  "AI-500": 500,
  "AI-502": 502,
  "AI-503": 503,
  "AI-504": 504,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    detail?: string,
  ) {
    super(detail ?? code);
    this.name = "AppError";
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

/** Maps any thrown value (AppError, AI SDK errors, fetch/abort errors) to a code. */
export function toErrorCode(err: unknown, depth = 0): ErrorCode {
  if (depth > 3 || err === null || typeof err !== "object") return "AI-500";

  if (err instanceof AppError) return err.code;

  const e = err as { name?: string; statusCode?: number; lastError?: unknown; cause?: unknown };

  if (e.name === "AbortError" || e.name === "TimeoutError") return "AI-504";

  // AI SDK RetryError wraps the last attempt
  if (e.lastError) return toErrorCode(e.lastError, depth + 1);

  if (typeof e.statusCode === "number") {
    const s = e.statusCode;
    if (s === 401 || s === 403) return "AI-401";
    if (s === 429) return "AI-429";
    if (s === 408 || s === 504) return "AI-504";
    return "AI-502";
  }

  if (e.cause) return toErrorCode(e.cause, depth + 1);

  return "AI-500";
}

export function errorBody(code: ErrorCode, requestId?: string) {
  return { error: { code, message: USER_MESSAGES[code], ...(requestId ? { requestId } : {}) } };
}

/**
 * Client side: turn whatever useChat reports into a code. useChat gives either
 * the JSON body of a non-2xx response or the bare code sent inside the stream.
 */
export function parseClientError(message: string | undefined): ErrorCode {
  if (!message) return "AI-500";
  const trimmed = message.trim();
  if (isErrorCode(trimmed)) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { error?: { code?: unknown } };
    if (isErrorCode(parsed.error?.code)) return parsed.error.code;
  } catch {
    // not JSON
  }
  const match = trimmed.match(/AI-\d{3}/);
  return match && isErrorCode(match[0]) ? match[0] : "AI-500";
}
