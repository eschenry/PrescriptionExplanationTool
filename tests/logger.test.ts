import { describe, expect, it } from "vitest";
import { formatLog, redact, serializeError } from "@/lib/logger";

describe("logger", () => {
  it("writes one JSON object with time, level and message", () => {
    const line = formatLog("info", "chat.start", { requestId: "r1" }, new Date("2026-01-01T00:00:00Z"));
    expect(JSON.parse(line)).toEqual({
      time: "2026-01-01T00:00:00.000Z",
      level: "info",
      msg: "chat.start",
      requestId: "r1",
    });
  });

  it("redacts content, prescriptions and keys at any depth", () => {
    const out = redact({ content: "warfarin", nested: { apiKey: "sk-or-123", Authorization: "Bearer x" }, ok: 1 });
    expect(out).toEqual({
      content: "[redacted]",
      nested: { apiKey: "[redacted]", Authorization: "[redacted]" },
      ok: 1,
    });
  });

  it("does not leak the provider request body from an error", () => {
    const err = Object.assign(new Error("Unauthorized"), {
      statusCode: 401,
      requestBodyValues: { messages: ["secret"] },
    });
    const s = serializeError(err);
    expect(s).toEqual({ name: "Error", message: "Unauthorized", statusCode: 401, code: undefined });
    expect(JSON.stringify(s)).not.toContain("secret");
  });
});
