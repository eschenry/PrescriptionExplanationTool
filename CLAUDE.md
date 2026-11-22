# CLAUDE.md

Notes for AI coding assistants working in this repo. Read `spec.md` first; it is the source of truth. If you change behaviour, update `spec.md` and add a row to its revision history.

## What this is
Next.js 14 (App Router) app that turns a GP's prescription into a plain-language patient handout using the Vercel AI SDK with OpenRouter. No database.

## Commands
- `npm run dev` start locally on http://localhost:3000
- `npm run lint` ESLint
- `npm run typecheck` `tsc --noEmit`
- `npm test` vitest (run once)
- `npm run build` production build

Run lint, typecheck and test before every commit.

## Rules
- The API key is read only in server code via `lib/env.ts`. Never use `NEXT_PUBLIC_` for secrets. Never log, return or hard-code a key.
- Validate every request body with the zod schemas in `lib/schema.ts`.
- User-facing errors are always `{ code, message }` from `lib/errors.ts`. Never pass a raw error message or stack to the client.
- Log with `lib/logger.ts` only (structured JSON). Never log prescription text or message content; log counts and lengths.
- Keep deterministic logic (abbreviations, safety list, rate limiting, error mapping) in `lib/` as pure functions with unit tests in `tests/`.
- Changes to the high-alert list or abbreviation table need a test.
- TypeScript strict. No `any` unless there is a comment explaining why.
- Tailwind for styling. No new UI libraries without a reason in the PR.

## Layout
- `app/api/chat/route.ts` chat endpoint (rate limit, validate, stream with tools)
- `app/api/health/route.ts` booleans-only health check
- `app/page.tsx` client UI
- `lib/` pure logic and server helpers
- `tests/` vitest unit tests
- `docs/` validation, PRD, architecture, demo script, reflection

## Commit style
Short imperative subject (`Add rate limiter`), body if the why is not obvious. Use the GitHub no-reply email for commits.
