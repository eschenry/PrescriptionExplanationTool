# Spec: Prescription Explanation Tool

## Revision history

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 2026-11-23 | eschenry | First draft from PRD and architecture notes. |

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
2. GP types or pastes the prescription, or uploads a `.txt` file which fills the box.
3. GP clicks **Explain prescription**. The handout streams in.
4. A **Safety checks** panel shows any fixed warnings returned by the `checkSafety` tool.
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
2. Rate limit check by client IP. Over limit: `429` with `AI-429`.
3. Parse body with zod. Fail: `400` with `AI-400`.
4. Check `OPENROUTER_API_KEY` is set. Missing: `503` with `AI-503`.
5. `streamText` with system prompt, messages, tools `expandSig` and `checkSafety`, `maxSteps: 4`, `temperature: 0.2`.
6. Return the data stream. Errors during streaming are converted to a code by `getErrorMessage`.

Error response body (non-stream errors):

```json
{ "error": { "code": "AI-429", "message": "Too many requests. Please wait a minute and try again." } }
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

JSON line per event: `time`, `level`, `msg`, `requestId`, and safe fields (`ip` hashed? no, see note), `messageCount`, `totalChars`, `durationMs`, `errorCode`. Prescription text and keys are never logged.

## 9. Tests (vitest)

Unit tests for: `expandSig`, `checkSafety`, rate limiter, error mapping, zod schema, logger redaction. Target 15 or more tests.

## 10. Acceptance criteria

- [ ] Normal prescription returns a handout with the four headings per medicine plus summary.
- [ ] Follow-up ("make it simpler") changes the previous handout instead of starting over.
- [ ] Off-topic message gets a short refusal.
- [ ] Prompt injection inside the prescription text does not change behaviour.
- [ ] Missing key returns `AI-503`; bad key returns `AI-401`.
- [ ] 11th request inside a minute from one IP returns `AI-429`.
- [ ] `/api/health` shows booleans only.
- [ ] CI is green: lint, typecheck, test, build, gitleaks.
