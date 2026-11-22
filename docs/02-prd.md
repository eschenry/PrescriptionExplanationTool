# PRD: Prescription Explanation Tool (v1)

Owner: eschenry | Status: Approved for build | Date: 23 November 2026

## Problem
Patients often leave a GP appointment unsure what each medicine is for, when to take it, and what to watch out for. Verbal explanations are forgotten, and pharmacy leaflets are long and generic. GPs have no quick way to hand over a short written explanation of the specific prescription they just wrote.

## Users
- **Primary:** GPs and family physicians in small and mid-sized practices. They operate the tool.
- **Secondary:** their patients (and carers), who receive the printed or copied explanation.

## Goal
A GP pastes or uploads a prescription and, in under a minute, gets a plain-language handout they can check, adjust and give to the patient.

## In scope (v1)
1. Text box for the prescription, plus upload of a `.txt` file into the same box.
2. AI-generated explanation with a fixed structure per medicine:
   - What it is for
   - How and when to take it
   - Common side effects
   - Important warnings
   - followed by an overall plain-language summary for the whole prescription.
3. Shorthand expansion done by code (for example `1 tab PO BID x7d` becomes "1 tablet by mouth, twice a day, for 7 days").
4. Fixed safety warnings for a short list of high-alert medicines and known risky combinations, added by code.
5. Follow-up messages in the same session ("make it simpler", "translate to Spanish", "she is pregnant, anything to add?").
6. Copy and print buttons.
7. Clear on-screen reminder that the doctor must review the text and must not enter patient identifiers.

## Out of scope (v1)
- Patient-facing use without a clinician.
- Photo or PDF upload with OCR (planned for v2).
- Saving prescriptions, user accounts, or EHR integration.
- Dose checking or drug selection advice.

## Requirements
| ID | Requirement |
|---|---|
| R1 | API key is read on the server only, from environment variables. Never sent to the browser. |
| R2 | All request input is validated with zod (message count, roles, length limits). |
| R3 | Basic rate limiting per client IP. |
| R4 | Users see generic errors with a short code (e.g. `AI-401`, `AI-429`). Details are logged server-side only, as structured JSON. |
| R5 | Off-topic requests and prompt-injection attempts get a short polite refusal. |
| R6 | `/api/health` reports configuration as true/false only, never values. |
| R7 | Vercel Web Analytics on the page. |
| R8 | CI runs lint, typecheck, tests, build and a secret scan on every push. |

## Success metrics
- Time from paste to usable handout: under 60 seconds (median).
- At least 3 of 5 test clinicians say they would use it for some patients.
- No dangerous factual errors found in the 5 standard test prescriptions.
- Error rate (5xx) under 2 percent of requests after launch.

## Risks
Wrong medical content (mitigated by doctor review, deterministic checks, low temperature, disclaimer); privacy (no identifiers, no storage, no prescription text in logs); misuse (scoped system prompt, input caps, rate limiting).

## Release plan
Build and test locally, push to a public GitHub repo with CI, deploy on Vercel, then test the live URL with a normal request, a follow-up, and an off-topic or injection message before submitting.
