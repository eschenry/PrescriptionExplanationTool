import { describe, expect, it } from "vitest";
import { handoutText, preserveLineBreaks } from "@/lib/message";

describe("handoutText", () => {
  it("drops narration written before the tool calls", () => {
    const parts = [
      { type: "step-start" },
      { type: "text", text: "I'll expand the three dosing instructions." },
      { type: "tool-invocation" },
      { type: "tool-invocation" },
      { type: "step-start" },
      { type: "text", text: "# Your medicines\n\n## Amoxicillin" },
    ];
    expect(handoutText(parts, "fallback")).toBe("# Your medicines\n\n## Amoxicillin");
  });

  it("returns all text when there were no tool calls (follow-ups, refusals)", () => {
    const parts = [{ type: "step-start" }, { type: "text", text: "Shorter version" }];
    expect(handoutText(parts, "fallback")).toBe("Shorter version");
  });

  it("returns an empty string while the tools have run but the handout has not started", () => {
    expect(handoutText([{ type: "text", text: "Checking..." }, { type: "tool-invocation" }], "Checking...")).toBe("");
  });

  it("falls back to message content when there are no parts", () => {
    expect(handoutText(undefined, "plain content")).toBe("plain content");
  });
});

describe("preserveLineBreaks", () => {
  it("turns single newlines into hard breaks", () => {
    expect(preserveLineBreaks("**What it is for:** x\n**How:** y")).toBe("**What it is for:** x  \n**How:** y");
  });

  it("leaves blank-line paragraph breaks alone", () => {
    expect(preserveLineBreaks("# Title\n\n## Section")).toBe("# Title\n\n## Section");
  });

  it("normalises Windows line endings", () => {
    expect(preserveLineBreaks("a\r\nb")).toBe("a  \nb");
  });
});
