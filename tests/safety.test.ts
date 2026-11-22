import { describe, expect, it } from "vitest";
import { checkSafety, classify } from "@/lib/safety";

describe("checkSafety", () => {
  it("returns nothing for routine medicines", () => {
    expect(checkSafety(["amoxicillin 500 mg", "paracetamol 1 g"])).toEqual({ highAlert: [], interactions: [] });
  });

  it("flags warfarin as high alert", () => {
    const r = checkSafety(["Warfarin 5 mg tab"]);
    expect(r.highAlert).toHaveLength(1);
    expect(r.highAlert[0].warning).toMatch(/INR/);
  });

  it("recognises brand names", () => {
    expect(classify("Eliquis 5mg")).toContain("doac");
    expect(classify("Nurofen 200mg")).toContain("nsaid");
  });

  it("detects warfarin plus ibuprofen as a bleeding risk", () => {
    const r = checkSafety(["warfarin 5 mg", "ibuprofen 400 mg"]);
    expect(r.interactions).toHaveLength(1);
    expect(r.interactions[0].pair).toEqual(["warfarin 5 mg", "ibuprofen 400 mg"]);
    expect(r.interactions[0].warning).toMatch(/bleeding/);
  });

  it("detects opioid plus benzodiazepine", () => {
    const r = checkSafety(["oxycodone 5 mg", "diazepam 2 mg"]);
    expect(r.interactions.map((i) => i.warning).join(" ")).toMatch(/breathing/);
  });

  it("reminds that methotrexate is usually weekly", () => {
    const r = checkSafety(["Methotrexate 10 mg"]);
    expect(r.highAlert[0].warning).toMatch(/ONCE A WEEK/);
  });

  it("does not match a drug name hidden inside another word", () => {
    expect(classify("aspiring athlete")).toEqual([]);
  });

  it("does not report a duplicate high-alert warning for the same class", () => {
    const r = checkSafety(["insulin glargine", "insulin aspart"]);
    expect(r.highAlert).toHaveLength(1);
  });

  it("ignores blank entries", () => {
    expect(checkSafety(["", "   "])).toEqual({ highAlert: [], interactions: [] });
  });
});
