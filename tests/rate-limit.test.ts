import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const c = clock();
    const rl = createRateLimiter({ max: 3, windowMs: 1000, now: c.now });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    const third = rl.check("a");
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("tells the caller how long to wait", () => {
    const c = clock();
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: c.now });
    rl.check("a");
    c.advance(300);
    expect(rl.check("a").retryAfterMs).toBe(700);
  });

  it("lets requests through again once the window slides past", () => {
    const c = clock();
    const rl = createRateLimiter({ max: 2, windowMs: 1000, now: c.now });
    rl.check("a");
    c.advance(500);
    rl.check("a");
    expect(rl.check("a").allowed).toBe(false);
    c.advance(501);
    expect(rl.check("a").allowed).toBe(true);
  });

  it("tracks each key separately", () => {
    const c = clock();
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: c.now });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("prunes stale keys when the map grows too large", () => {
    const c = clock();
    const rl = createRateLimiter({ max: 5, windowMs: 1000, now: c.now, maxKeys: 2 });
    rl.check("a");
    rl.check("b");
    rl.check("c");
    c.advance(2000);
    rl.check("d");
    expect(rl.size()).toBe(1);
  });
});
