import { describe, expect, it } from "vitest";
import { expandSig } from "@/lib/sig";

describe("expandSig", () => {
  it("expands a standard antibiotic course", () => {
    expect(expandSig("1 cap PO TID x7d").plain).toBe("1 capsule by mouth three times a day for 7 days");
  });

  it("pluralises the dose form when the quantity is more than one", () => {
    expect(expandSig("2 tabs PO BID").plain).toBe("2 tablets by mouth twice a day");
  });

  it("keeps half a tablet singular", () => {
    expect(expandSig("1/2 tab PO daily").plain).toBe("1/2 tablet by mouth once a day");
  });

  it("handles every-N-hours and as-needed instructions", () => {
    expect(expandSig("1 tab PO q6h PRN pain").plain).toBe("1 tablet by mouth every 6 hours when needed pain");
  });

  it("handles hour ranges like q4-6h", () => {
    expect(expandSig("2 puffs INH q4-6h PRN").plain).toBe("2 puffs inhaled every 4 to 6 hours when needed");
  });

  it("expands meal timing and bedtime", () => {
    expect(expandSig("1 tab PO AC").plain).toBe("1 tablet by mouth before meals");
    expect(expandSig("1 tab PO QHS").plain).toBe("1 tablet by mouth at bedtime");
  });

  it("handles a spaced duration such as x 2 weeks", () => {
    expect(expandSig("1 tab PO BD x 2 weeks").plain).toBe("1 tablet by mouth twice a day for 2 weeks");
  });

  it("flags OD as ambiguous instead of silently picking one meaning", () => {
    const result = expandSig("1 cap PO OD");
    expect(result.ambiguous).toEqual(["OD"]);
    expect(result.plain).toContain("please check");
  });

  it("keeps unknown words such as drug names unchanged", () => {
    expect(expandSig("Metformin 500 mg PO BID with food").plain).toBe("Metformin 500 mg by mouth twice a day with food");
  });

  it("strips trailing commas and trims whitespace", () => {
    const r = expandSig("  1 tab, PO, BID  ");
    expect(r.original).toBe("1 tab, PO, BID");
    expect(r.plain).toBe("1 tablet by mouth twice a day");
  });
});
