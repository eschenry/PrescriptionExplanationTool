# Idea Validation: Prescription Explanation Tool

Author: eschenry
Course: AIM GenAI and Agentic AI, Week 4, Assignment 4.2
Last updated: 23 November 2026

This file covers the seven validation steps I went through before writing any code. Some of the numbers below are estimates. Where I estimated, I say so and show how I got there.

---

## 1.1 Define the problem

Patients walk out of a GP visit with a prescription and, very often, a weak idea of what they are supposed to do with it. The doctor explained it, but the explanation happened in the last two minutes of a 12 to 15 minute appointment, usually while the patient was still thinking about the diagnosis.

What goes wrong afterwards is predictable:

- The patient forgets which tablet is for what, especially when there are three or more.
- "Twice daily" turns into "whenever I remember".
- An antibiotic gets stopped on day three because the patient feels better.
- A normal side effect (a dry cough on an ACE inhibitor, an upset stomach on metformin) scares the patient into stopping, and nobody finds out until the next visit.
- The patient calls the clinic or the pharmacy with questions the doctor already answered once.

Pharmacy leaflets exist, but they are written to cover every possible patient, run to several pages of small print, and are not tied to the reason this particular patient was given the drug.

**Problem statement:** GPs do not have a fast way to give each patient a short, plain-language written explanation of their own prescription, so patients leave confused and some of them take their medicines wrongly or stop taking them.

**Who feels the pain:** the patient feels it first. The GP and clinic staff feel it second, as repeat calls, repeat visits and poorer outcomes.

## 1.2 Profile the target users

There are two people involved, and they are not the same person.

**Primary user (operates the tool): the GP or family physician**

- Works in a small to mid-sized family practice, sometimes alone, sometimes with 3 to 10 colleagues.
- Sees 20 to 35 patients a day. Time per patient is the tightest constraint they have.
- Already types the prescription into an EHR or writes it by hand.
- Comfortable with a browser. Not interested in learning a new system that needs training.
- Cares about patient safety and about medico-legal exposure. Will not hand something to a patient that they have not read.
- Typical quote I would expect from a GP: "I'd use it if it took less time than explaining it again on the phone."

**Secondary user (receives the output): the patient**

- Any adult, but the people who benefit most are older patients on several medicines, patients with low health literacy, carers looking after a parent, and anyone starting a new long-term medicine.
- Reads the handout at home, often days later.
- Wants to know: what is this for, when do I take it, what might I notice, and when should I worry.

**Other people in the picture**

- Practice nurses and practice managers, who handle follow-up calls and would notice a drop in them.
- Community pharmacists, who already counsel patients and would see the handout as a complement, not a replacement.

**Who is not a target user (for now):** hospital discharge teams, specialists with complex regimens (oncology, transplant), and patients using the tool on their own without a clinician. That last group matters for safety: the tool is built for the doctor to review before the patient sees anything.

## 1.3 Size the market and document the evidence

### Evidence that the problem is real

- **People forget most of what they are told.** Kessels (2003, Journal of the Royal Society of Medicine) reviewed the research on patient recall and found that 40 to 80 percent of medical information is forgotten almost immediately, and about half of what is remembered is remembered incorrectly.
- **Non-adherence is common.** The World Health Organization's 2003 report "Adherence to Long-Term Therapies" put average adherence to long-term medication in developed countries at around 50 percent.
- **Health literacy is a large factor.** The US National Assessment of Adult Literacy (2003) found that roughly 36 percent of adults had basic or below-basic health literacy, meaning they would struggle with a typical medicine label or leaflet.
- **The cost is large.** Non-adherence in the US is commonly estimated to cost the health system between 100 and 300 billion US dollars a year in avoidable admissions and complications (figures vary by study; Iuga and McGuire, 2014, give a good summary).

### Rough market size (estimate)

I sized this bottom-up, starting from the people who would actually pay.

| Item | Figure | Note |
|---|---|---|
| Family physicians and GPs in the US | about 120,000 | Rounded; AAFP membership is in this range |
| Share in small or independent practices that buy their own tools | about 40% | My assumption |
| Reachable GPs | about 48,000 | 120,000 x 40% |
| Price | 20 USD per GP per month | Priced below a single avoidable 15-minute call per week |
| Serviceable market, US only | about 11.5 million USD per year | 48,000 x 20 x 12 |

The UK, Canada, Australia and the Philippines all have GP-led primary care and would at least double this. It is not a huge market, but it is a real one, and the bigger opportunity is selling to clinic groups and EHR vendors later.

## 1.4 Map the competition

| Alternative | What it does well | Where it falls short for this problem |
|---|---|---|
| Doctor explains verbally | Personal, free, tailored | Forgotten quickly, nothing to take home |
| Pharmacy leaflet (manufacturer PIL) | Complete and regulated | Long, generic, not tied to the patient's reason for taking it |
| EHR after-visit summary (e.g. Epic, Cerner patient instructions) | Built into the workflow | Usually a list of drug names and doses; plain-language text is limited and often switched off in small practices |
| Drug reference sites and apps (Drugs.com, WebMD, Medscape) | Detailed and free | The patient has to search, and the content is not specific to their regimen |
| Reminder apps (Medisafe, MyTherapy) | Good at timing and reminders | Do not explain why or what to watch for; the patient sets them up alone |
| Patient education libraries (Lexicomp, First Databank, Healthwise) | Reviewed content, can be licensed into EHRs | Expensive licences, one sheet per drug, not combined into one handout |
| General chatbots (ChatGPT, Gemini) | Fast, conversational | No clinician in the loop, inconsistent format, no privacy guarantees, patient may get confident but wrong answers |

The gap is a tool that takes the whole prescription, as written by the doctor, and produces one short combined handout in a fixed, readable format, with the doctor reviewing it before it goes out.

## 1.5 Define the edge

What this tool does that the alternatives do not do together:

1. **One handout for the whole prescription.** Not one leaflet per drug. The patient gets a single page that covers everything they were given that day.
2. **Doctor in the loop.** The GP generates it, reads it, and can ask for changes ("simpler", "add that she should take it with food", "translate to Tagalog") before printing. It is never sent straight to the patient.
3. **Same structure every time.** Every medicine gets the same five headings: what it is for, how and when to take it, common side effects, important warnings, and a plain summary. Patients and staff learn where to look.
4. **Deterministic safety checks alongside the AI.** Prescription shorthand (BID, PRN, PO) is expanded by code, not guessed by the model, and a fixed list of high-alert medicines and known risky combinations triggers standard warnings that the model cannot leave out.
5. **Speed.** Under a minute from pasting the prescription to having something printable.

The honest weakness: the content quality depends on the model. That is why the doctor review step and the deterministic checks are not optional features. They are the product.

## 1.6 Design a cheap test

Before building anything large, I want to know whether GPs would actually use it in a real consult.

**Test 1: paper prototype with GPs (cost: about 2 hours, no money)**

- Take five realistic but made-up prescriptions (for example: amoxicillin course; metformin plus atorvastatin; warfarin; a new inhaler; ibuprofen plus omeprazole).
- Generate handouts with a prompt in a general chatbot, then clean the format by hand so it looks like the planned output.
- Show them to 5 GPs or family medicine residents. Ask three questions: Would you give this to a patient as it is? What would you change? Would you spend 30 seconds per patient to produce this?
- **Pass condition:** at least 3 of 5 say they would use it for some of their patients, and no one finds a dangerous error in the samples.

**Test 2: patient teach-back (cost: one afternoon)**

- Give 10 volunteers (friends and family, ideally including a few over 60) either the standard pharmacy leaflet or the generated handout for the same prescription.
- After 10 minutes, ask them to explain when they take each medicine and what side effect would make them call the doctor.
- **Pass condition:** the handout group answers correctly more often than the leaflet group.

**Test 3: deployed MVP (this assignment)**

- Put the working version online and ask two or three clinicians to try it with dummy prescriptions. Track how many generate a second request in the same session (a sign they found it useful enough to refine) using Vercel Web Analytics.

## 1.7 Stress-test the idea

I tried to argue against the idea as hard as I could. These are the strongest objections and what I would do about each.

| Risk | How bad | Response |
|---|---|---|
| **The model gets a fact wrong** (wrong side effect, wrong timing) | High. This is medical information. | Doctor must review before printing; the UI says so. Shorthand is expanded by code. High-alert warnings come from a fixed list. Temperature kept low. A visible disclaimer on every output. |
| **Privacy: doctors paste patient names or identifiers** | High | The tool does not need any patient identifiers and the UI tells users not to enter them. No database, no storage of prescriptions, and logs never contain the prescription text. For real clinical use, a provider with a data-processing agreement would be required. |
| **Regulation: is this a medical device?** | Medium | It does not diagnose, choose drugs, or set doses. It explains a prescription a clinician already wrote, and the clinician reviews the output. That keeps it closer to patient education material than decision support, but proper regulatory advice is needed before any commercial launch. |
| **GPs are too busy to add a step** | Medium | Target is under one minute. If the paper test shows GPs will not spend 30 seconds, the idea fails, and that is exactly what Test 1 is for. |
| **EHR vendors build this themselves** | Medium, long term | Likely to happen eventually. The near-term path is small independent practices that do not have it, and later an integration or licence deal rather than competing head-on. |
| **Prompt misuse** (users asking it unrelated questions or trying to override instructions) | Low to medium | The system prompt limits it to explaining prescriptions; off-topic or injection attempts get a short refusal. Input length is capped and requests are rate limited. |
| **Language and literacy** | Medium | Output is written at roughly a grade 6 to 8 reading level, and the doctor can ask for a translation as a follow-up. Translation quality still needs human checking. |

**Verdict:** the idea survives, but only as a clinician-reviewed tool. A version that patients use directly, without a doctor reading the output, would not pass this stress test and is out of scope.
