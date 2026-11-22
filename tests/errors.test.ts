import { describe, expect, it } from "vitest";
import { AppError, errorBody, parseClientError, toErrorCode, USER_MESSAGES } from "@/lib/errors";

describe("toErrorCode", () => {
  it("passes AppError codes through", () => {
    expect(toErrorCode(new AppError("AI-400"))).toBe("AI-400");
  });

  it("maps provider HTTP status codes", () => {
    expect(toErrorCode({ name: "AI_APICallError", statusCode: 401 })).toBe("AI-401");
    expect(toErrorCode({ name: "AI_APICallError", statusCode: 403 })).toBe("AI-401");
    expect(toErrorCode({ name: "AI_APICallError", statusCode: 429 })).toBe("AI-429");
    expect(toErrorCode({ name: "AI_APICallError", statusCode: 500 })).toBe("AI-502");
    expect(toErrorCode({ name: "AI_APICallError", statusCode: 504 })).toBe("AI-504");
  });

  it("maps aborts and timeouts to AI-504", () => {
    expect(toErrorCode({ name: "TimeoutError" })).toBe("AI-504");
    expect(toErrorCode({ name: "AbortError" })).toBe("AI-504");
  });

  it("unwraps retry errors to the last attempt", () => {
    expect(toErrorCode({ name: "AI_RetryError", lastError: { statusCode: 429 } })).toBe("AI-429");
  });

  it("falls back to AI-500 for unknown values", () => {
    expect(toErrorCode(new Error("boom"))).toBe("AI-500");
    expect(toErrorCode("string error")).toBe("AI-500");
    expect(toErrorCode(null)).toBe("AI-500");
  });
});

describe("errorBody", () => {
  it("contains only the code, generic message and request id", () => {
    expect(errorBody("AI-429", "abc")).toEqual({
      error: { code: "AI-429", message: USER_MESSAGES["AI-429"], requestId: "abc" },
    });
  });
});

describe("parseClientError", () => {
  it("reads a bare code sent inside the stream", () => {
    expect(parseClientError("AI-401")).toBe("AI-401");
  });

  it("reads the JSON body of a failed response", () => {
    expect(parseClientError(JSON.stringify(errorBody("AI-429")))).toBe("AI-429");
  });

  it("falls back to AI-500 for anything else", () => {
    expect(parseClientError("Failed to fetch")).toBe("AI-500");
    expect(parseClientError(undefined)).toBe("AI-500");
  });
});
