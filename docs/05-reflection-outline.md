# Reflection outline

Notes to expand into the written reflection. Bullets are prompts for me, not the final text.

## 1. What I built and why
- One-sentence summary of the tool and who it is for.
- Why this problem: patient recall research (40 to 80 percent forgotten), my own experience or a family member's with confusing prescriptions (add a real example).

## 2. How validation changed the idea
- The stress test pushed me to make it clinician-only. A patient-facing version did not survive the safety and liability questions.
- Competition map showed that leaflets and EHR summaries exist, so the edge had to be "one combined handout, same format, doctor reviews it".
- What I would actually run first from the cheap-test plan, and what result would make me drop the idea.

## 3. Technical decisions I would defend
- Tool calling for shorthand and high-alert checks, so fixed facts come from code and the safety panel shows even if the model forgets.
- Error codes instead of raw errors; JSON logs with no prescription text.
- In-memory rate limit as a deliberate "good enough for v1", with its weakness written down.
- Spec first, then a review pass that caught real gaps (streaming errors can't change the status code; no timeout meant AI-504 was impossible).

## 4. Working with an AI coding assistant
- What it sped up (scaffolding, tests, CI).
- Where I had to check it: medical wording in the safety list, version choices (Next 14 vs newer packages), anything it stated as fact.
- How CLAUDE.md, .cursorrules and spec.md kept it consistent.

## 5. What testing on the live site showed
- Normal request, follow-up, injection attempt: what happened in each.
- Fixes made and recorded in the spec revision history (list them once done).

## 6. What I would do next
- v2 issue: photo/PDF upload with OCR.
- Shared rate limit store, a reviewed medication content source, translation checked by native speakers, a real pilot with 3 to 5 GPs.

## 7. What I learned
- One technical lesson, one product lesson, one about my own process.
