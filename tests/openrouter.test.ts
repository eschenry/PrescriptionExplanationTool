import { describe, expect, it, vi } from "vitest";
import { createOpenRouterFetch, parseReasoningSetting, withReasoning } from "@/lib/openrouter";

describe("parseReasoningSetting", () => {
  it("defaults to none when unset or invalid", () => {
    expect(parseReasoningSetting(undefined)).toBe("none");
    expect(parseReasoningSetting("turbo")).toBe("none");
  });

  it("accepts known efforts case-insensitively, and 'default'", () => {
    expect(parseReasoningSetting(" Low ")).toBe("low");
    expect(parseReasoningSetting("default")).toBe("default");
  });
});

describe("withReasoning", () => {
  it("adds the effort to a chat completions body and keeps other fields", () => {
    const out = JSON.parse(withReasoning(JSON.stringify({ model: "m", max_tokens: 10 }), "none"));
    expect(out).toEqual({ model: "m", max_tokens: 10, reasoning: { effort: "none" } });
  });

  it("leaves the body alone for 'default' or non-JSON input", () => {
    const body = JSON.stringify({ model: "m" });
    expect(withReasoning(body, "default")).toBe(body);
    expect(withReasoning("not json", "none")).toBe("not json");
  });
});

describe("createOpenRouterFetch", () => {
  it("rewrites POST bodies before calling the real fetch", async () => {
    const base = vi.fn(async () => new Response("ok"));
    const f = createOpenRouterFetch("low", base as unknown as typeof fetch);
    await f("https://x/chat/completions", { method: "POST", body: JSON.stringify({ model: "m" }) });
    const sent = (base.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(sent.body as string).reasoning).toEqual({ effort: "low" });
  });

  it("passes GET requests through untouched", async () => {
    const base = vi.fn(async () => new Response("ok"));
    const f = createOpenRouterFetch("none", base as unknown as typeof fetch);
    await f("https://x/models", { method: "GET" });
    expect(base).toHaveBeenCalledWith("https://x/models", { method: "GET" });
  });
});
