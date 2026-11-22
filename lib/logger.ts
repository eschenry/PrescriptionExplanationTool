// Structured JSON logs, one object per line. Vercel picks these up from stdout.
// Never log prescription text, message content or secrets. The redaction below
// is a safety net, not permission to pass them in.

export type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED_KEYS = new Set([
  "content",
  "prescription",
  "messages",
  "prompt",
  "apikey",
  "api_key",
  "authorization",
  "openrouter_api_key",
  "requestbodyvalues",
  "headers",
]);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return serializeError(value);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Keep only fields that are safe and useful. Provider errors carry the request body, so we do not spread them. */
export function serializeError(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== "object") return { message: String(err) };
  const e = err as { name?: string; message?: string; statusCode?: number; code?: string };
  return {
    name: e.name,
    message: typeof e.message === "string" ? e.message.slice(0, 500) : undefined,
    statusCode: e.statusCode,
    code: e.code,
  };
}

export function formatLog(level: LogLevel, msg: string, fields: Record<string, unknown> = {}, now = new Date()): string {
  const safe = redact(fields) as Record<string, unknown>;
  return JSON.stringify({ time: now.toISOString(), level, msg, ...safe });
}

export function createLogger(base: Record<string, unknown> = {}) {
  const write = (level: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    const line = formatLog(level, msg, { ...base, ...fields });
    if (level === "error" || level === "warn") console.error(line);
    else console.log(line);
  };
  return {
    debug: (msg: string, f?: Record<string, unknown>) => write("debug", msg, f),
    info: (msg: string, f?: Record<string, unknown>) => write("info", msg, f),
    warn: (msg: string, f?: Record<string, unknown>) => write("warn", msg, f),
    error: (msg: string, f?: Record<string, unknown>) => write("error", msg, f),
  };
}
