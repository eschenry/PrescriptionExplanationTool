# Reflection: Prescription Explanation Tool

Week 4, Graded Assignment 4.2 | eschenry | November 2026

## What I built and why

It's a web app for GPs. You paste in a prescription and it writes a handout the patient can read at home: what each medicine is for, how and when to take it, side effects, and what to watch out for. The doctor reads it over, asks for changes if they want, and prints it. It's live at https://prescription-explanation-tool.vercel.app.

Patients forget a lot of what they're told in a consultation, somewhere between 40 and 80 percent according to Kessels (2003), and the prescription usually gets explained right at the end when everyone is already getting up. Pharmacy leaflets don't really fix that. They're long and they're written for everyone.

<!-- Optional: add one or two sentences about a time you, or someone you know, came home unsure about a prescription. -->

## How validation changed the idea

At first I pictured patients using it on their own. The stress test put a stop to that. Once I'd written "the model gets a fact wrong" next to "this is medical information", I couldn't see an honest way to skip the doctor. So it's for clinicians only, and their review is part of how it works, not a line at the bottom. If I took it further, I'd show printed handouts to five GPs first. If fewer than three said they'd use it, or anyone found a dangerous mistake, I'd stop there.

## Decisions I'd defend

The main one: anything with a single right answer comes from code, not the model. One tool expands shorthand like "TID x7d" from a lookup table, and another checks a short list of high-alert drugs. The warfarin warning goes into its own panel straight from that check, so it shows up even if the model forgets it.

I also kept errors boring for the user. They see a short message and a code like AI-429, and the details go into server logs that leave out the prescription text and the key.

And I reviewed the spec before writing code. That found ten gaps, including an AI-504 timeout code I'd listed without ever setting a timeout.

## What live testing showed

All 52 unit tests passed when I deployed, and two of my three live tests still failed. The first handout stopped in the middle of a word ("unusual ble"), and the follow-up came back empty. Reading the raw stream showed `finishReason: "length"`. The model was using up its output budget on reasoning I couldn't see. Turning reasoning off and raising the limit fixed both. Three smaller fixes came after that, and they're all in the spec's revision history. The off-topic and injection tests passed first time. When I hid an instruction inside a prescription, the model ignored it and pointed it out to the doctor.

## Working with an AI assistant

Claude Code wrote most of the code. I made the product decisions and checked what it did, especially the package versions and anything that read like medical advice. Keeping the rules in CLAUDE.md and the spec stopped things from drifting over a long session.

## What I learned and what's next

Look at the raw output, not just the screen. My unit tests only checked my own logic. The live test was the first time the model, the provider and the streaming ran together, and that's where the problems turned up. Next I'd build a set of test prescriptions to score the output against, have a clinician go through the safety list, add photo and PDF upload (GitHub issue #1), and try it with a few GPs.

There's a longer version of this in [06-reflection-long.md](06-reflection-long.md).
