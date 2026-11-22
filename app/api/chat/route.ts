import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { getConfig } from "@/lib/env";
import { AppError, errorBody, HTTP_STATUS, toErrorCode, type ErrorCode } from "@/lib/errors";
import { looksLikeInjection } from "@/lib/guard";
import { createLogger, serializeError } from "@/lib/logger";
import { createOpenRouterFetch } from "@/lib/openrouter";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp, hashIp, newRequestId } from "@/lib/request";
import { checkSafety } from "@/lib/safety";
import { chatRequestSchema, checkSafetyInput, expandSigInput, toModelMessages } from "@/lib/schema";
import { expandSig } from "@/lib/sig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PROVIDER_TIMEOUT_MS = 25_000;

const config = getConfig();
const limiter = createRateLimiter({ max: config.rateLimitMax, windowMs: config.rateLimitWindowMs });

const tools = {
  expandSig: tool({
    description: "Expand a prescription dosing instruction (sig) written in shorthand into plain words.",
    parameters: expandSigInput,
    execute: async ({ sig }) => expandSig(sig),
  }),
  checkSafety: tool({
    description:
      "Check all medicines on the prescription against a fixed list of high-alert medicines and known risky combinations.",
    parameters: checkSafetyInput,
    execute: async ({ medications }) => checkSafety(medications),
  }),
};

function jsonError(code: ErrorCode, requestId: string, extraHeaders: Record<string, string> = {}) {
  return Response.json(errorBody(code, requestId), {
    status: HTTP_STATUS[code],
    headers: { "x-request-id": requestId, ...extraHeaders },
  });
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const started = Date.now();
  const ipHash = hashIp(getClientIp(req.headers));
  const log = createLogger({ requestId, route: "/api/chat", ipHash });

  // 1. Rate limit
  const rl = limiter.check(ipHash);
  if (!rl.allowed) {
    log.warn("chat.rate_limited", { errorCode: "AI-429", retryAfterMs: rl.retryAfterMs });
    return jsonError("AI-429", requestId, { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) });
  }

  try {
    // 2. Validate
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new AppError("AI-400", "body is not valid JSON");
    }
    const parsed = chatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError("AI-400", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    const messages = toModelMessages(parsed.data);

    // 3. Config
    if (!config.apiKey) throw new AppError("AI-503", "OPENROUTER_API_KEY is not set");

    const lastUser = messages[messages.length - 1]?.content ?? "";
    const injectionSuspected = looksLikeInjection(lastUser);
    log.info("chat.start", {
      model: config.model,
      reasoning: config.reasoning,
      messageCount: messages.length,
      totalChars: messages.reduce((n, m) => n + m.content.length, 0),
      injectionSuspected,
    });

    const openrouter = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      compatibility: "compatible",
      fetch: createOpenRouterFetch(config.reasoning),
      headers: { "HTTP-Referer": config.siteUrl, "X-Title": "Prescription Explanation Tool" },
    });

    // 4. Stream with tools
    const result = streamText({
      model: openrouter.chat(config.model),
      system: SYSTEM_PROMPT,
      messages,
      tools,
      maxSteps: 4,
      temperature: 0.2,
      maxTokens: 2500,
      abortSignal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      onError: ({ error }) => {
        log.error("chat.stream_error", { errorCode: toErrorCode(error), error: serializeError(error) });
      },
      onFinish: ({ finishReason, usage, steps, text }) => {
        // "length" or an empty reply means the user saw an incomplete handout
        const level = finishReason === "length" || text.trim().length === 0 ? "warn" : "info";
        log[level]("chat.finish", {
          textChars: text.length,
          finishReason,
          durationMs: Date.now() - started,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          toolCalls: steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)),
        });
      },
    });

    return result.toDataStreamResponse({
      headers: { "x-request-id": requestId },
      getErrorMessage: (error) => toErrorCode(error),
    });
  } catch (error) {
    const code = toErrorCode(error);
    const level = code === "AI-400" ? "warn" : "error";
    log[level]("chat.error", { errorCode: code, durationMs: Date.now() - started, error: serializeError(error) });
    return jsonError(code, requestId);
  }
}
