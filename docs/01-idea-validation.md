# Idea Validation: Prescription Explanation Tool

Author: eschenry
Course: AIM GenAI and Agentic AI, Week 4, Assignment 4.2
Last updated: 23 November 2026

These are the seven validation steps I worked through before writing any code. A few of the numbers are my own estimates. Where that's the case I've said so and shown the working.

---

## 1.1 Define the problem

A lot of patients leave a GP appointment with a prescription and only a rough idea of what to do with it. The doctor did explain it, but usually in the last couple of minutes of a 12 to 15 minute slot, while the patient was still taking in the diagnosis.

What happens next is pretty predictable:

- They lose track of which tablet is for what, especially once there are three or more.
- "Twice daily" slowly becomes "whenever I remember".
- The antibiotic gets stopped on day three because they feel fine.
- A normal side effect, like a dry cough on an ACE inhibitor or an upset stomach on metformin, worries them enough to stop, and nobody finds out until the next visit.
- They ring the clinic or the pharmacy to ask things the doctor already told them.

There are pharmacy leaflets, but they're written to cover every possible patient, they run to several pages of small print, and they say nothing about why this particular person was given the drug.

Problem statement: GPs don't have a quick way to give each patient a short written explanation of their own prescription in plain language, so patients go home confused, and some end up taking their medicines wrongly or stopping them.

The patient is the one who feels it first. The GP and the clinic staff feel it later, as repeat phone calls, repeat visits and worse outcomes.

## 1.2 Profile the target users

Two different people are involved: the one who uses the tool and the one who reads what it produces.

### The GP or family physician (uses the tool)

- Works in a small or mid-sized family practice, either alone or with 3 to 10 colleagues.
- Sees 20 to 35 patients a day, so time per patient is the tightest constraint.
- Already enters prescriptions into an EHR or writes them by hand.
- Fine with a browser, but has no interest in a new system that needs training.
- Cares about patient safety and about medico-legal risk, and won't hand a patient anything they haven't read.
- What I'd expect one to say: "I'd use it if it took less time than explaining it again on the phone."

### The patient (reads the handout)

- Any adult, really. The ones who'd get the most out of it are older patients on several medicines, people with low health literacy, carers looking after a parent, and anyone starting a new long-term medicine.
- Reads it at home, often a few days later.
- Mainly wants to know four things: what's this for, when do I take it, what might I notice, and when should I worry.

### Others affected

- Practice nurses and managers, who take the follow-up calls and would notice if there were fewer.
- Community pharmacists, who already counsel patients. I'd expect them to see a handout like this as backing them up, not replacing them.

For now I'm leaving out hospital discharge teams, specialists with complicated regimens (oncology, transplant), and patients using the tool on their own without a clinician. That last one is a safety decision. The whole design assumes a doctor reads the output before the patient does.

## 1.3 Size the market and document the evidence

### Evidence that the problem is real

- People forget most of what they're told. Kessels (2003, Journal of the Royal Society of Medicine) reviewed the recall research and found 40 to 80 percent of medical information is forgotten almost immediately, and about half of what people do remember, they remember wrongly.
- Plenty of patients don't take their medicines as prescribed. The WHO's 2003 report "Adherence to Long-Term Therapies" put average adherence to long-term medication in developed countries at around 50 percent.
- Health literacy plays a big part. The US National Assessment of Adult Literacy (2003) found roughly 36 percent of adults had basic or below-basic health literacy, which means a typical medicine label or leaflet would be hard going for them.
- It's expensive. Non-adherence is often estimated to cost the US health system somewhere between 100 and 300 billion US dollars a year in avoidable admissions and complications. The figures vary a lot between studies; Iuga and McGuire (2014) summarise them well.

### Rough market size (my estimate)

I worked this out from the bottom up, starting with the people who'd actually pay for it.

| Item | Figure | Note |
|---|---|---|
| Family physicians and GPs in the US | about 120,000 | Rounded. AAFP membership is around this. |
| Share in small or independent practices that buy their own tools | about 40% | My assumption |
| GPs I could realistically reach | about 48,000 | 120,000 x 40% |
| Price | 20 USD per GP per month | Less than the cost of one avoidable 15-minute phone call a week |
| Serviceable market, US only | about 11.5 million USD a year | 48,000 x 20 x 12 |

The UK, Canada, Australia and the Philippines all have GP-led primary care, which would at least double that. It isn't a huge market, but it's a real one, and the bigger opportunity later on would be clinic groups and EHR vendors.

## 1.4 Map the competition

| Alternative | What it's good at | Why it doesn't solve this |
|---|---|---|
| The doctor explaining it out loud | Personal, free, tailored | Forgotten quickly, and there's nothing to take home |
| Pharmacy leaflet (manufacturer PIL) | Complete and regulated | Long and generic, and doesn't mention why the patient is taking it |
| EHR after-visit summary (e.g. Epic, Cerner patient instructions) | Already part of the workflow | Mostly a list of drug names and doses. The plain-language text is limited and small practices often have it turned off. |
| Drug reference sites and apps (Drugs.com, WebMD, Medscape) | Detailed and free | The patient has to go looking, and nothing is specific to their combination of medicines |
| Reminder apps (Medisafe, MyTherapy) | Good for timing and reminders | Don't explain why, or what to watch for, and the patient has to set them up alone |
| Patient education libraries (Lexicomp, First Databank, Healthwise) | Reviewed content that can be licensed into EHRs | Expensive licences, and it's one sheet per drug rather than one handout |
| General chatbots (ChatGPT, Gemini) | Quick and conversational | No clinician involved, the format changes every time, no privacy guarantees, and the patient can get wrong answers that sound confident |

What's missing is something that takes the whole prescription as the doctor wrote it and gives back one short handout, in the same readable layout every time, which the doctor checks before it goes out.

## 1.5 Define the edge

None of the alternatives above do all of these at once:

1. One handout for the whole prescription, not a leaflet per drug. The patient gets a single page covering everything they were given that day.
2. The doctor stays in charge of it. The GP generates it, reads it, and can ask for changes ("simpler", "add that she should take it with food", "translate to Tagalog") before printing. Nothing goes straight to the patient.
3. The layout never changes. Every medicine gets the same five headings: what it's for, how and when to take it, common side effects, important warnings, and a short summary. After a while patients and staff know where to look.
4. Some checks are done by code, not the model. Shorthand like BID, PRN and PO is expanded from a table rather than guessed, and a fixed list of high-alert medicines and risky combinations adds standard warnings the model can't drop.
5. It's quick: under a minute from pasting the prescription to having something you can print.

The obvious weakness is that the quality of the writing depends on the model. That's why I don't treat the doctor's review or the fixed checks as optional extras. Without them I wouldn't build it.

## 1.6 Design a cheap test

Before building anything big I want to find out whether GPs would really use this in a consultation.

### Test 1: paper prototype with GPs (about 2 hours, no cost)

- Write five realistic but made-up prescriptions, for example: an amoxicillin course; metformin with atorvastatin; warfarin; a new inhaler; ibuprofen with omeprazole.
- Generate handouts for them using a prompt in a general chatbot, and tidy the format by hand so they look like the real thing would.
- Show them to 5 GPs or family medicine residents and ask three questions. Would you give this to a patient as it is? What would you change? Would you spend 30 seconds per patient making one?
- It passes if at least 3 of the 5 say they'd use it for some of their patients, and nobody finds a dangerous error in the samples.

### Test 2: patient teach-back (one afternoon)

- Give 10 volunteers (friends and family, ideally a few over 60) either the normal pharmacy leaflet or the generated handout for the same prescription.
- After 10 minutes, ask them when they take each medicine and which side effect would make them call the doctor.
- It passes if the handout group gets more of the answers right than the leaflet group.

### Test 3: deployed MVP (this assignment)

- Put a working version online and ask two or three clinicians to try it with dummy prescriptions. Using Vercel Web Analytics, track how many go on to make a second request in the same session, which suggests it was useful enough to bother refining.

## 1.7 Stress-test the idea

I tried to argue against the idea as hard as I could. These were the strongest objections and what I'd do about each.

| Risk | How serious | What I'd do about it |
|---|---|---|
| The model gets a fact wrong (a side effect, the timing) | High, because it's medical information | The doctor has to review it before printing, and the screen says so. Shorthand is expanded by code, the high-alert warnings come from a fixed list, the temperature is kept low, and every output carries a disclaimer. |
| Doctors paste in patient names or other identifiers | High | The tool doesn't need any identifiers and the screen tells people not to enter them. There's no database, prescriptions aren't stored, and the logs never contain the prescription text. Real clinical use would also need a provider with a data-processing agreement. |
| It might count as a medical device | Medium | It doesn't diagnose, pick drugs or set doses. It explains a prescription a clinician has already written, and the clinician checks the result. I think that puts it closer to patient education material than decision support, but it would need proper regulatory advice before any commercial launch. |
| GPs are too busy to add another step | Medium | The aim is under a minute. If the paper test shows GPs won't spend 30 seconds on it, the idea fails, and finding that out is the point of Test 1. |
| EHR vendors build the same thing | Medium, longer term | That will probably happen at some point. In the short term the market is small independent practices that don't have it, and later an integration or licence deal makes more sense than competing directly. |
| People misuse the prompt (unrelated questions, trying to override the instructions) | Low to medium | The system prompt keeps it to explaining prescriptions, and anything off-topic or any injection attempt gets a short refusal. Input length is capped and requests are rate limited. |
| Language and literacy | Medium | The output aims for roughly a grade 6 to 8 reading level, and the doctor can ask for a translation as a follow-up. Someone still needs to check the translation. |

My conclusion is that the idea holds up, but only as a tool a clinician reviews. A version patients use directly, without a doctor reading the output first, wouldn't get past this stress test, so it's out of scope.
