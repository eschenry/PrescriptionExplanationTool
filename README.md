# Prescription Explanation Tool

A small web app for GPs and family doctors. Paste (or upload) a prescription and it writes a plain-language handout for the patient: what each medicine is for, how and when to take it, common side effects and important warnings. The doctor reads it, asks for changes if needed ("simpler", "in Spanish", "she's 82"), then prints or copies it.

**Live app:** https://prescription-explanation-tool.vercel.app
**Health check:** https://prescription-explanation-tool.vercel.app/api/health

![CI](https://github.com/eschenry/PrescriptionExplanationTool/actions/workflows/ci.yml/badge.svg)

> This is a course project (AIM GenAI and Agentic AI, Week 4). The output is a draft for a clinician to review, not medical advice. Do not enter patient identifiers.

## How it works

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**.
- **Vercel AI SDK 4** calls a model through **OpenRouter** (default `anthropic/claude-haiku-5.5`).
- The model uses two **tools** backed by plain TypeScript functions:
  - `expandSig` turns shorthand like `1 tab PO BID x7d` into "1 tablet by mouth twice a day for 7 days" using a lookup table, and flags ambiguous ones like `OD`.
  - `checkSafety` checks names against a short fixed list of high-alert medicines (warfarin, insulin, methotrexate, opioids...) and risky pairs (warfarin + ibuprofen, opioid + benzodiazepine...). Its result is shown in a separate panel straight from the tool output.
- Input is validated with **zod**, requests are **rate limited** per IP, and errors reach the user only as a generic sentence plus a short code (`AI-429`). Details go to **structured JSON logs** on the server.
- `/api/health` reports whether configuration is present, as true/false only.
- **Vercel Web Analytics** counts page views.

More detail: [spec.md](spec.md), [docs/03-architecture.md](docs/03-architecture.md).

## Run it locally

Requirements: Node.js 20 or newer (tested on 22 and 26), npm, an OpenRouter API key.

```bash
git clone https://github.com/eschenry/PrescriptionExplanationTool.git
cd PrescriptionExplanationTool
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
# open .env.local and paste your OpenRouter key after OPENROUTER_API_KEY=
npm run dev
```

Open http://localhost:3000 and click **Load example**, then **Explain prescription**.

## Environment variables

| Name | Required | Default | What it does |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | | OpenRouter key. Server only. Never commit it. |
| `OPENROUTER_MODEL` | No | `anthropic/claude-haiku-5.5` | Any OpenRouter model that supports tool calling. |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | OpenRouter API endpoint. |
| `OPENROUTER_REASONING_EFFORT` | No | `none` | Reasoning effort sent to OpenRouter. `none` keeps replies fast and stops hidden reasoning from using up the output budget. Set `default` (send nothing) or `low` if you switch to a model that cannot turn reasoning off. |
| `RATE_LIMIT_MAX` | No | `10` | Requests allowed per window per IP. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Window length in milliseconds. |

## Tests

```bash
npm test           # 65 unit tests (vitest)
npm run lint
npm run typecheck
npm run build
```

The tests cover the deterministic parts: abbreviation expansion, the safety list and interaction pairs, the rate limiter (with a fake clock), error-code mapping, the zod request schema, log redaction, the injection heuristic, the health booleans, IP hashing and the OpenRouter reasoning setting, and how the handout text is picked out of a streamed message.

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request, plus a **gitleaks** scan of the whole git history for committed keys.

## Deployment (Vercel)

1. Go to https://vercel.com/new and sign in with GitHub.
2. Find **PrescriptionExplanationTool** in the list and click **Import**.
3. Leave Framework Preset as **Next.js** and the build settings as they are.
4. Open **Environment Variables** and add `OPENROUTER_API_KEY` with your key. Optionally add `OPENROUTER_MODEL`.
5. Click **Deploy**. When it finishes, open the URL and check `/api/health` shows `"openrouterKeyConfigured": true`.
6. In the project, go to **Analytics** and click **Enable** for Web Analytics.

Every push to `main` deploys again automatically. If you change an environment variable later, redeploy from **Deployments → ⋯ → Redeploy** so the new value is picked up.

## Error codes

| Code | What the user sees | Usual cause |
|---|---|---|
| AI-400 | Request could not be processed | Empty or too long input |
| AI-401 | AI service rejected credentials | Wrong or revoked OpenRouter key |
| AI-429 | Too many requests | Our rate limit, or OpenRouter's |
| AI-500 | Something went wrong | Unexpected server error, check logs |
| AI-502 | AI service returned an error | OpenRouter or model problem |
| AI-503 | Service not configured | `OPENROUTER_API_KEY` missing |
| AI-504 | AI service took too long | Model slow or down, timeout is 25 s |

Every error response carries an `x-request-id` header and a `requestId`, which you can search for in the Vercel logs.

## Troubleshooting

- **AI-503 on the live site.** The key is not set in Vercel, or it was added after the last deploy. Add it under Settings → Environment Variables (Production), then redeploy.
- **AI-401.** The key is wrong, has no credit, or was revoked. Check it on https://openrouter.ai/settings/keys and update the Vercel variable.
- **AI-502 straight away.** The model name in `OPENROUTER_MODEL` may not exist or may not support tools. Remove the variable to use the default.
- **Handout cut short, or an empty reply.** Usually the model spent its output budget on hidden reasoning. Make sure `OPENROUTER_REASONING_EFFORT` is unset or `none`. Search the logs for `chat.finish` with `"level":"warn"`: `finishReason: "length"` or `textChars: 0` confirms it.
- **AI-502 after changing the model.** Some models always reason and reject `effort: "none"`. Set `OPENROUTER_REASONING_EFFORT=default`.
- **AI-429 while testing.** Wait a minute, or raise `RATE_LIMIT_MAX`. The limit is per server instance.
- **`npm install` fails on a work laptop.** The company network may block the npm registry. Push to GitHub and let the CI workflow build and test it instead.
- **Logs.** Vercel → project → **Logs**. Each line is JSON; filter by `requestId` or `msg` (`chat.start`, `chat.finish`, `chat.error`, `chat.rate_limited`).

## Project docs

- [docs/01-idea-validation.md](docs/01-idea-validation.md) seven-step idea validation
- [docs/02-prd.md](docs/02-prd.md) one-page PRD
- [docs/03-architecture.md](docs/03-architecture.md) architecture notes
- [spec.md](spec.md) spec with revision history
- [docs/04-demo-script.md](docs/04-demo-script.md) two-minute demo script
- [docs/05-reflection-outline.md](docs/05-reflection-outline.md) reflection outline

## Limits

The high-alert list is short and illustrative, not a drug database. The rate limit lives in memory per serverless instance. There is no storage and no login. See the open v2 issue for what comes next.
