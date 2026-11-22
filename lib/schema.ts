import { z } from "zod";

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 8000;
export const MAX_TOTAL_CHARS = 40000;

// useChat sends extra fields (id, createdAt, parts, toolInvocations). We accept
// and ignore them; only role and content are forwarded to the model.
// "system" is not accepted from the client.
const messageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(MAX_MESSAGE_CHARS),
  })
  .passthrough();

export const chatRequestSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  })
  .passthrough()
  .superRefine((body, ctx) => {
    const { messages } = body;
    messages.forEach((m, i) => {
      if (m.role === "user" && m.content.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "empty user message", path: ["messages", i, "content"] });
      }
    });
    if (messages[messages.length - 1]?.role !== "user") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "last message must be from the user", path: ["messages"] });
    }
    const total = messages.reduce((sum, m) => sum + m.content.length, 0);
    if (total > MAX_TOTAL_CHARS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "conversation too long", path: ["messages"] });
    }
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ModelMessage {
  role: "user" | "assistant";
  content: string;
}

/** Strips everything except role and content, and drops empty assistant turns. */
export function toModelMessages(body: ChatRequest): ModelMessage[] {
  return body.messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content }));
}

// Tool input schemas (used by the AI SDK tool definitions).
export const expandSigInput = z.object({
  sig: z.string().min(1).max(300).describe("The dosing instruction exactly as written, e.g. '1 tab PO BID x7d'"),
});

export const checkSafetyInput = z.object({
  medications: z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(30)
    .describe("Every medicine name on the prescription, one per item, e.g. ['warfarin 5 mg', 'ibuprofen 400 mg']"),
});
