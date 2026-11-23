# Reflection: Prescription Explanation Tool

Week 4, Graded Assignment 4.2 | eschenry | November 2026

## What I built and why

A web app for GPs that turns a prescription into a plain-language handout: what each medicine is for, how and when to take it, side effects and warnings. The doctor reviews it, asks for changes if needed, then prints it. It is live at https://prescription-explanation-tool.vercel.app.

Patients forget 40 to 80 percent of what they are told in a consultation (Kessels, 2003), and prescriptions usually get explained in the last rushed minutes. Pharmacy leaflets are long, generic and not tied to the patient in front of you.

<!-- Optional: add one or two sentences about a time you, or someone you know, came home unsure about a prescription. -->

## How validation changed the idea

I first pictured something patients would use on their own. The stress test ended that. Once I wrote "the model gets a fact wrong" next to "this is medical information", there was no honest way to skip the clinician. The tool became clinician-only, with review as part of the workflow rather than a line at the bottom. The next real step would be a paper test with five GPs. If fewer than three would use it, or anyone spots a dangerous error, I would stop and rethink.

## Decisions I would defend

- **Fixed facts come from code, not the model.** One tool expands shorthand like "TID x7d" from a lookup table. Another checks a short high-alert list. The warfarin warning shows in its own panel straight from the tool output, so it appears even if the model forgets it.
- **Users see a short code, not a raw error** ("AI-429"). Details go to JSON logs that strip message content and keys.
- **Spec review before code.** Going back over spec v0.1 found ten gaps, including an AI-504 timeout code with no timeout behind it.

## What live testing showed

All 52 unit tests were green when I deployed, and two of the three live tests still failed. The first handout stopped mid-word ("unusual ble") and the follow-up came back empty. The raw stream showed `finishReason: "length"`: the model was spending its output budget on hidden reasoning. Turning reasoning off and raising the limit fixed both. Three smaller fixes followed (length, narration before tool calls, merged lines), each recorded in the spec revision history. The off-topic and injection tests passed first time, including an instruction hidden inside a prescription, which the model flagged to the doctor.

## Working with an AI assistant

Claude Code did most of the building. I made the product decisions and checked its work, especially version choices and anything that read as medical advice. CLAUDE.md and the spec kept a long session consistent.

## What I learned and what comes next

Read the raw output, not just the screen. Unit tests covered my logic; only the live test covered the model, the provider and the streaming together, and that is where the problems were. Next I would add a fixed set of test prescriptions scored for accuracy, get a clinician to review the safety list, add photo and PDF upload (GitHub issue #1), and run a small pilot with GPs.

A longer version of this reflection is in [06-reflection-long.md](06-reflection-long.md).
