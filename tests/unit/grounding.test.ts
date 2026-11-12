import { describe, expect, it } from "vitest";
import type { ResearchOutput } from "@/lib/ai/types";
import { groundCandidates } from "@/lib/research-grounding";
import { redactPII } from "@/lib/redact";

const cand = (o: Partial<ResearchOutput["candidates"][number]>): ResearchOutput["candidates"][number] => ({
  field: "aux_flow_lpm",
  value: 120,
  valueText: null,
  unit: "L/min",
  meaning: "auxiliary circuit maximum flow",
  appliesTo: null,
  confidence: "high",
  sourceUrl: "https://www.cat.com/en_US/products/new/equipment/excavators/mini-excavators/308.html",
  sourceTitle: "Cat 308",
  sourceType: "official_site",
  excerpt: "Auxiliary circuit 120 L/min",
  locator: null,
  ...o,
});

const retrieved = [{ url: "https://cat.com/en_US/products/new/equipment/excavators/mini-excavators/308.html/", title: "Cat 308", text: "Auxiliary circuit flow 120 L/min at 250 bar. Operating weight 8 400 kg" }];

describe("research grounding", () => {
  it("accepts a candidate whose URL was actually retrieved and whose value appears in the page", () => {
    const { accepted } = groundCandidates({ summary: "", notes: [], candidates: [cand({})] }, retrieved);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].valueCanonical).toBe(120);
  });

  it("rejects a candidate citing a URL that was never retrieved (no invented citations)", () => {
    const { accepted, rejected } = groundCandidates({ summary: "", notes: [], candidates: [cand({ sourceUrl: "https://example.com/made-up" })] }, retrieved);
    expect(accepted).toHaveLength(0);
    expect(rejected[0]).toContain("source_not_retrieved");
  });

  it("rejects a value that does not appear in the fetched page text", () => {
    const { accepted } = groundCandidates({ summary: "", notes: [], candidates: [cand({ value: 140 })] }, retrieved);
    expect(accepted).toHaveLength(0);
  });

  it("matches numbers with thousands separators and converts units", () => {
    const { accepted } = groundCandidates(
      { summary: "", notes: [], candidates: [cand({ field: "operating_weight_t", value: 8400, unit: "kg", excerpt: "8 400 kg" })] },
      retrieved,
    );
    expect(accepted[0].valueCanonical).toBeCloseTo(8.4, 10);
  });

  it("rejects ambiguous or unsupported units", () => {
    const { accepted } = groundCandidates({ summary: "", notes: [], candidates: [cand({ field: "operating_weight_t", value: 8, unit: "tons" })] }, retrieved);
    expect(accepted).toHaveLength(0);
  });

  it("rejects implausible values", () => {
    const r = [{ ...retrieved[0], text: "flow 9000 L/min" }];
    const { accepted } = groundCandidates({ summary: "", notes: [], candidates: [cand({ value: 9000 })] }, r);
    expect(accepted).toHaveLength(0);
  });
});

describe("PII redaction", () => {
  it("removes emails and phone numbers but keeps machine numbers", () => {
    const s = redactPII("Call me at +372 5555 1234 or mail jane@example.com about my CAT 308 2021 with 120 L/min");
    expect(s).toContain("[phone]");
    expect(s).toContain("[email]");
    expect(s).toContain("CAT 308 2021");
    expect(s).toContain("120 L/min");
  });
});
