// Sliding-window rate limiter kept in memory.
// On Vercel each serverless instance has its own memory, so this is a basic
// guard, not a global limit. A shared store (Upstash/Vercel KV) is the v2 path.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  max: number;
  windowMs: number;
  now?: () => number;
  /** Prune stale keys once the map grows past this size. */
  maxKeys?: number;
}

export function createRateLimiter({ max, windowMs, now = Date.now, maxKeys = 5000 }: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  function prune(currentTime: number) {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= currentTime - windowMs) {
        hits.delete(key);
      }
    }
  }

  function check(key: string): RateLimitResult {
    const t = now();
    if (hits.size > maxKeys) prune(t);

    const recent = (hits.get(key) ?? []).filter((ts) => ts > t - windowMs);

    if (recent.length >= max) {
      hits.set(key, recent);
      const retryAfterMs = Math.max(0, recent[0] + windowMs - t);
      return { allowed: false, remaining: 0, retryAfterMs };
    }

    recent.push(t);
    hits.set(key, recent);
    return { allowed: true, remaining: max - recent.length, retryAfterMs: 0 };
  }

  return { check, size: () => hits.size };
}
