import { describe, expect, it } from "vitest";
import { glossaryAnswer, matchGlossary } from "@/lib/intake/glossary";

describe("glossary", () => {
  it("answers short definitional questions for free", () => {
    expect(matchGlossary("What is a case drain?")).toBe("case_drain_line");
    expect(matchGlossary("what's a free return line")).toBe("free_return_line");
    expect(matchGlossary("Explain bi-directional auxiliary hydraulics")).toBe("bidirectional_aux");
    expect(glossaryAnswer("case_drain_line")).toMatch(/drains leakage oil/);
  });
  it("leaves real questions to the AI", () => {
    expect(matchGlossary("Will the SC 600 work on my machine if I install a case drain?")).toBeNull();
    expect(matchGlossary("Which model is best for big stumps?")).toBeNull();
  });
});
