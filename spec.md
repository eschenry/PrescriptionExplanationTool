# Spec: Prescription Explanation Tool

## Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 2026-11-23 | eschenry | First draft from PRD and architecture notes. |
| 0.2 | 2026-11-23 | eschenry | Changes after spec review (see section 11): IP is hashed in logs; upload limits defined; refusal wording and injection flag defined; safety panel states defined; `Retry-After` on 429; 25 s provider timeout mapped to AI-504; disclaimer rendered by the UI, not the model; `requestId` returned with errors; clarified that provider errors after streaming starts arrive in the stream. |

## 1. Purpose

Web app for GPs. The GP pastes or uploads a prescription and gets a plain-language patient handout that they review, refine with follow-up messages, and then copy or print.

## 2. Stack

- Next.js 14 (App Router), TypeScript (strict), Tailwind CSS 3
- Vercel AI SDK 4 (`ai`, `@ai-sdk/openai`) using OpenRouter as an OpenAI-compatible endpoint
- zod for validation, vitest for tests, ESLint (`next/core-web-vitals`)
- `@vercel/analytics` for page analytics
- Hosting: Vercel. CI: GitHub Actions.

## 3. Environment variables

| Name | Required | Default | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | yes | none | Server only. Never prefixed `NEXT_PUBLIC_`. |
| `OPENROUTER_MODEL` | no | `anthropic/claude-haiku-5.5` | Any OpenRouter model that supports tool calling. |
| `OPENROUTER_BASE_URL` | no | `https://openrouter.ai/api/v1` | Only change for testing. |
| `RATE_LIMIT_MAX` | no | `10` | Requests per window per IP. |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Window length. |

## 4. User flow

1. GP opens the page. Sees a short note: review before giving to a patient, do not enter patient identifiers.
2. GP types or pastes the prescription, or uploads a `.txt` file which fills the box. Upload is read in the browser (nothing is sent until the GP clicks the button). Only `.txt`, max 50 KB; anything else shows an inline message.
3. GP clicks **Explain prescription**. The handout streams in.
4. A **Safety checks** panel shows the result of the `checkSafety` tool, taken straight from the tool result:
   - matches found: each warning listed;
   - tool ran, nothing matched: "No medicines on the fixed high-alert list were found.";
   - tool did not run (for example an off-topic reply): panel hidden.
   Under every assistant answer the UI (not the model) shows: "Draft for clinician review. Check before giving to a patient."
5. GP can send follow-ups in the same thread (simpler wording, translation, extra context).
6. GP clicks **Copy** or **Print** on the latest answer. **Start over** clears the thread.

## 5. API

### POST `/api/chat`

Request body (validated by zod):

```ts
{
  messages: Array<{
    role: "user" | "assistant";
    content: string;          // 1..8000 chars after trim
  }>;                          // 1..20 items, last item must be "user"
}
```

Extra fields sent by `useChat` (id, createdAt, parts, toolInvocations) are allowed but ignored. Only `role` and `content` are forwarded to the model.

Processing order:
1. Create `requestId`.
2. Rate limit check by client IP. Over limit: `429` with `AI-429` and a `Retry-After` header in seconds.
3. Parse body with zod. Fail: `400` with `AI-400`.
4. Check `OPENROUTER_API_KEY` is set. Missing: `503` with `AI-503`.
5. Run `looksLikeInjection` (lib/guard.ts) on the last user message. It only sets a log flag `injectionSuspected`; it does not block, because medical text can trip simple patterns. The system prompt does the actual refusing.
6. `streamText` with system prompt, messages, tools `expandSig` and `checkSafety`, `maxSteps: 4`, `temperature: 0.2`, and an abort signal that fires after 25 seconds.
7. Return the data stream with an `x-request-id` header. Provider errors that happen after the stream has started (bad key, provider 5xx, timeout) cannot change the HTTP status any more, so they are sent inside the stream as the code only (for example `AI-401`) via `getErrorMessage`, and the UI shows the matching generic message.

Off-topic or injection reply: the model answers with one sentence: "I can only help explain prescriptions and patient handouts. Please paste a prescription to get started." It does not call tools in that case.

Error response body (non-stream errors):

```json
{ "error": { "code": "AI-429", "message": "Too many requests. Please wait a minute and try again.", "requestId": "b3f1c2..." } }
```

### GET `/api/health`

```json
{ "status": "ok", "openrouterKeyConfigured": true, "modelConfigured": false, "time": "2026-11-23T10:00:00.000Z" }
```

`modelConfigured` is true only when `OPENROUTER_MODEL` is set explicitly (the default is still used if false). Values are never returned.

## 6. Tools

### `expandSig(sig: string)`
Returns `{ original, plain }`. Lowercases and tokenises the instruction, replaces known abbreviations from a table (route, frequency, timing, form, duration such as `x7d`), keeps unknown tokens as written.

### `checkSafety(medications: string[])`
Returns `{ highAlert: Array<{ medication, warning }>, interactions: Array<{ pair, warning }> }`. Matching is case-insensitive on generic name or a listed brand name.

## 7. Error codes

`AI-400`, `AI-401`, `AI-429`, `AI-500`, `AI-502`, `AI-503`, `AI-504`. See `docs/03-architecture.md` for meanings. Users see code plus generic message only.

## 8. Logging

JSON line per event: `time`, `level`, `msg`, `requestId`, and safe fields: `ipHash` (first 12 hex chars of SHA-256 of the IP, enough to spot one noisy client without storing the address), `messageCount`, `totalChars`, `injectionSuspected`, `toolCalls`, `durationMs`, `errorCode`, `finishReason`. Prescription text, message content and keys are never logged; the logger also strips keys named `content`, `prescription`, `apiKey`, `authorization`, `messages` as a safety net.

## 9. Tests (vitest)

Unit tests for: `expandSig`, `checkSafety`, rate limiter (using an injected clock), error mapping, zod schema, logger redaction, injection heuristic, env config booleans. Target 15 or more tests.

## 10. Acceptance criteria

- [ ] Normal prescription returns a handout with the four headings per medicine plus summary.
- [ ] Follow-up ("make it simpler") changes the previous handout instead of starting over.
- [ ] Off-topic message gets a short refusal.
- [ ] Prompt injection inside the prescription text does not change behaviour.
- [ ] Missing key returns HTTP 503 with `AI-503`; a bad key shows `AI-401` in the UI (delivered in the stream).
- [ ] 11th request inside a minute from one IP returns `AI-429`.
- [ ] `/api/health` shows booleans only.
- [ ] CI is green: lint, typecheck, test, build, gitleaks.

## 11. Review notes (v0.1 to v0.2)

I reviewed v0.1 against the PRD requirements R1 to R8 and the acceptance list. Findings and what changed:

1. Logging section left the IP question open. Decided: hash it, keep 12 hex chars.
2. Upload had no limits. Added `.txt` only, 50 KB, read client-side.
3. "Off-topic gets a refusal" was not testable without fixed wording. Added the exact sentence.
4. Nothing said what happens when the injection check fires. Made it log-only, with the reason.
5. Safety panel had no empty or hidden state. Defined all three.
6. 429 gave no hint about when to retry. Added `Retry-After`.
7. No timeout was specified, so AI-504 could never happen. Added a 25 s abort.
8. The disclaimer depended on the model remembering to write it. Moved it into the UI.
9. Users had nothing to quote when reporting a problem. Added `requestId` to error bodies and an `x-request-id` header.
10. "Bad key returns AI-401" was wrong for a streaming response, since the status is already 200 by then. Reworded the criterion.
