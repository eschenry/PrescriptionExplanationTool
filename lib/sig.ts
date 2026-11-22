// Expands prescription shorthand ("1 tab PO BID x7d") into plain words.
// Deliberately a lookup table, not the model: these meanings are fixed and
// we do not want them guessed.

export interface SigResult {
  original: string;
  plain: string;
  /** Abbreviations that have more than one common meaning and need a human to check. */
  ambiguous: string[];
}

const FORMS: Record<string, [singular: string, plural: string]> = {
  tab: ["tablet", "tablets"],
  tabs: ["tablet", "tablets"],
  tablet: ["tablet", "tablets"],
  tablets: ["tablet", "tablets"],
  cap: ["capsule", "capsules"],
  caps: ["capsule", "capsules"],
  capsule: ["capsule", "capsules"],
  capsules: ["capsule", "capsules"],
  gtt: ["drop", "drops"],
  gtts: ["drop", "drops"],
  puff: ["puff", "puffs"],
  puffs: ["puff", "puffs"],
  supp: ["suppository", "suppositories"],
  tsp: ["teaspoon (5 mL)", "teaspoons (5 mL each)"],
  tbsp: ["tablespoon (15 mL)", "tablespoons (15 mL each)"],
  sachet: ["sachet", "sachets"],
  sachets: ["sachet", "sachets"],
  unit: ["unit", "units"],
  units: ["unit", "units"],
  u: ["unit", "units"],
};

const TERMS: Record<string, string> = {
  // route
  po: "by mouth",
  "p.o.": "by mouth",
  sl: "under the tongue",
  top: "on the skin",
  inh: "inhaled",
  pr: "into the back passage (rectally)",
  pv: "into the vagina",
  sc: "as an injection under the skin",
  sq: "as an injection under the skin",
  subcut: "as an injection under the skin",
  im: "as an injection into the muscle",
  iv: "into a vein",
  os: "in the left eye",
  ou: "in both eyes",
  // frequency
  qd: "once a day",
  daily: "once a day",
  bid: "twice a day",
  bd: "twice a day",
  tid: "three times a day",
  tds: "three times a day",
  qid: "four times a day",
  qds: "four times a day",
  qod: "every other day",
  qhs: "at bedtime",
  hs: "at bedtime",
  nocte: "at night",
  mane: "in the morning",
  qam: "every morning",
  qpm: "every evening",
  prn: "when needed",
  stat: "straight away",
  weekly: "once a week",
  // timing
  ac: "before meals",
  pc: "after meals",
  cc: "with meals",
  // units
  mg: "mg",
  mcg: "micrograms",
  "µg": "micrograms",
  g: "g",
  ml: "mL",
};

/** Abbreviations with two common meanings depending on country or context. */
const AMBIGUOUS: Record<string, string> = {
  od: "once a day (OD can also mean right eye; please check)",
};

const DURATION_UNITS: Record<string, [string, string]> = {
  d: ["day", "days"],
  day: ["day", "days"],
  days: ["day", "days"],
  w: ["week", "weeks"],
  wk: ["week", "weeks"],
  wks: ["week", "weeks"],
  week: ["week", "weeks"],
  weeks: ["week", "weeks"],
  m: ["month", "months"],
  mo: ["month", "months"],
  month: ["month", "months"],
  months: ["month", "months"],
};

function isNumber(token: string): boolean {
  return /^\d+(\.\d+)?$|^\d+\/\d+$/.test(token);
}

function numericValue(token: string): number {
  if (token.includes("/")) {
    const [a, b] = token.split("/").map(Number);
    return b ? a / b : NaN;
  }
  return Number(token);
}

function pluralise(count: number, forms: [string, string]): string {
  return count === 1 || count < 1 ? forms[0] : forms[1];
}

function expandToken(raw: string, prev: string | undefined): string | null {
  const t = raw.toLowerCase();

  // every N hours: q6h, q4-6h
  const everyHours = t.match(/^q(\d+)(?:-(\d+))?h$/);
  if (everyHours) {
    return everyHours[2]
      ? `every ${everyHours[1]} to ${everyHours[2]} hours`
      : `every ${everyHours[1]} hours`;
  }

  // duration: x7d, x2w, x1m
  const duration = t.match(/^x(\d+)(d|w|wk|wks|m|mo)$/);
  if (duration) {
    const n = Number(duration[1]);
    return `for ${n} ${pluralise(n, DURATION_UNITS[duration[2]])}`;
  }

  // bare duration: 7d, 2w (only when the previous token was "x" or "for")
  const bareDuration = t.match(/^(\d+)(d|w|wk|wks|mo)$/);
  if (bareDuration) {
    const n = Number(bareDuration[1]);
    return `${n} ${pluralise(n, DURATION_UNITS[bareDuration[2]])}`;
  }

  if (t === "x") return "for";

  if (t in FORMS) {
    const count = prev && isNumber(prev) ? numericValue(prev) : 1;
    return pluralise(count, FORMS[t]);
  }

  if (t in TERMS) return TERMS[t];
  if (t in AMBIGUOUS) return AMBIGUOUS[t];

  // "days" after "x 7" -> keep as plain word
  if (t in DURATION_UNITS && prev && isNumber(prev)) {
    return pluralise(numericValue(prev), DURATION_UNITS[t]);
  }

  return null;
}

export function expandSig(input: string): SigResult {
  const original = input.trim();
  const tokens = original
    .split(/\s+/)
    .map((tok) => tok.replace(/[,;]+$/, ""))
    .filter(Boolean);

  const ambiguous: string[] = [];
  const out: string[] = [];

  tokens.forEach((token, i) => {
    const lower = token.toLowerCase();
    if (lower in AMBIGUOUS && !ambiguous.includes(token.toUpperCase())) {
      ambiguous.push(token.toUpperCase());
    }
    const expanded = expandToken(token, tokens[i - 1]?.toLowerCase());
    out.push(expanded ?? token);
  });

  return { original, plain: out.join(" "), ambiguous };
}
