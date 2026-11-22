// Fixed safety checks. This is a short illustrative list based on commonly
// cited community high-alert medicines (e.g. ISMP), not a full interaction
// database. The point is that these warnings come from code and always
// appear, whatever the model writes.

export type DrugClass =
  | "warfarin"
  | "doac"
  | "insulin"
  | "sulfonylurea"
  | "methotrexate"
  | "opioid"
  | "benzodiazepine"
  | "lithium"
  | "digoxin"
  | "nsaid"
  | "trimethoprim"
  | "aceArb"
  | "potassiumSparing"
  | "simvastatin"
  | "clarithromycin";

const CLASS_MEMBERS: Record<DrugClass, string[]> = {
  warfarin: ["warfarin", "coumadin", "jantoven"],
  doac: ["apixaban", "eliquis", "rivaroxaban", "xarelto", "dabigatran", "pradaxa", "edoxaban", "lixiana", "savaysa"],
  insulin: ["insulin", "lantus", "levemir", "tresiba", "humalog", "novorapid", "novolog", "apidra", "toujeo", "humulin", "novomix"],
  sulfonylurea: ["glipizide", "glyburide", "glibenclamide", "gliclazide", "glimepiride", "diamicron"],
  methotrexate: ["methotrexate", "trexall", "otrexup", "metoject"],
  opioid: ["morphine", "oxycodone", "hydrocodone", "fentanyl", "tramadol", "codeine", "tapentadol", "hydromorphone", "buprenorphine", "methadone", "oxycontin", "percocet", "vicodin"],
  benzodiazepine: ["diazepam", "lorazepam", "alprazolam", "clonazepam", "temazepam", "valium", "ativan", "xanax", "klonopin"],
  lithium: ["lithium"],
  digoxin: ["digoxin", "lanoxin"],
  nsaid: ["ibuprofen", "naproxen", "diclofenac", "aspirin", "celecoxib", "mefenamic", "ketorolac", "indomethacin", "meloxicam", "advil", "motrin", "nurofen", "aleve", "voltaren"],
  trimethoprim: ["trimethoprim", "co-trimoxazole", "cotrimoxazole", "bactrim", "septra"],
  aceArb: ["lisinopril", "enalapril", "ramipril", "perindopril", "captopril", "losartan", "valsartan", "irbesartan", "candesartan", "telmisartan", "olmesartan"],
  potassiumSparing: ["spironolactone", "eplerenone", "amiloride", "aldactone"],
  simvastatin: ["simvastatin", "zocor"],
  clarithromycin: ["clarithromycin", "biaxin", "klacid"],
};

const HIGH_ALERT: Partial<Record<DrugClass, string>> = {
  warfarin:
    "Blood thinner. Needs regular INR blood tests. Do not start or stop other medicines, including aspirin, ibuprofen or herbal products, without checking with your doctor or pharmacist. Get urgent help for unusual bleeding, black stools or a sudden severe headache.",
  doac:
    "Blood thinner. Do not skip doses or stop it suddenly unless your doctor tells you to. Avoid ibuprofen, naproxen and aspirin unless your doctor agrees. Get urgent help for unusual bleeding or black stools.",
  insulin:
    "Can cause low blood sugar (shaking, sweating, confusion). Know how to treat a low, check your sugar as advised, and never share pens or needles.",
  sulfonylurea:
    "Can cause low blood sugar, especially if you skip meals or drink alcohol. Know the signs: shaking, sweating, confusion.",
  methotrexate:
    "Usually taken ONCE A WEEK, not every day. Taking it daily by mistake can be very dangerous. You will need regular blood tests.",
  opioid:
    "Can cause drowsiness and slowed breathing. Do not drink alcohol or take sleeping tablets with it. Do not drive if drowsy. Store out of reach of children.",
  benzodiazepine:
    "Can cause drowsiness and dependence. Do not combine with alcohol or opioid painkillers. Do not stop suddenly after long use.",
  lithium:
    "Needs regular blood tests. Drink enough fluids. Dehydration, ibuprofen-type painkillers and some blood pressure tablets can raise lithium levels. Get help for vomiting, diarrhoea, shaking or confusion.",
  digoxin:
    "The safe dose range is narrow. Report nausea, changes in vision, or a slow or irregular heartbeat.",
};

const INTERACTIONS: Array<{ a: DrugClass; b: DrugClass; warning: string }> = [
  { a: "warfarin", b: "nsaid", warning: "Together these raise the risk of bleeding. Check with the prescriber that this combination is intended." },
  { a: "doac", b: "nsaid", warning: "Together these raise the risk of bleeding. Check with the prescriber that this combination is intended." },
  { a: "opioid", b: "benzodiazepine", warning: "Together these can cause severe drowsiness and dangerously slow breathing." },
  { a: "methotrexate", b: "trimethoprim", warning: "Trimethoprim can make methotrexate much more toxic. This combination is usually avoided." },
  { a: "lithium", b: "nsaid", warning: "Anti-inflammatory painkillers can raise lithium to harmful levels." },
  { a: "aceArb", b: "potassiumSparing", warning: "Together these can raise potassium levels. Blood tests are usually needed." },
  { a: "simvastatin", b: "clarithromycin", warning: "Clarithromycin can raise simvastatin levels and cause muscle damage. The statin is often paused during the course." },
];

export interface HighAlertMatch {
  medication: string;
  warning: string;
}

export interface InteractionMatch {
  pair: [string, string];
  warning: string;
}

export interface SafetyResult {
  highAlert: HighAlertMatch[];
  interactions: InteractionMatch[];
}

function containsWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(haystack);
}

/** Returns every class a free-text medication line belongs to. */
export function classify(medication: string): DrugClass[] {
  const lower = medication.toLowerCase();
  return (Object.keys(CLASS_MEMBERS) as DrugClass[]).filter((cls) =>
    CLASS_MEMBERS[cls].some((name) => containsWord(lower, name)),
  );
}

export function checkSafety(medications: string[]): SafetyResult {
  const classified = medications
    .map((m) => m.trim())
    .filter(Boolean)
    .map((medication) => ({ medication, classes: classify(medication) }));

  const highAlert: HighAlertMatch[] = [];
  const seenClasses = new Set<DrugClass>();
  for (const { medication, classes } of classified) {
    for (const cls of classes) {
      const warning = HIGH_ALERT[cls];
      if (warning && !seenClasses.has(cls)) {
        seenClasses.add(cls);
        highAlert.push({ medication, warning });
      }
    }
  }

  const interactions: InteractionMatch[] = [];
  for (const rule of INTERACTIONS) {
    const first = classified.find((c) => c.classes.includes(rule.a));
    const second = classified.find((c) => c.classes.includes(rule.b) && c !== first);
    if (first && second) {
      interactions.push({ pair: [first.medication, second.medication], warning: rule.warning });
    }
  }

  return { highAlert, interactions };
}
