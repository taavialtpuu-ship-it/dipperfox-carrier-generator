import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/compatibility/engine";
import { csvCell, toCsv } from "@/lib/csv";
import type { AssessmentDTO } from "@/lib/dto";
import { buildLeadSnapshot } from "@/lib/leads";
import { approvalFileSchema } from "@/lib/approvals";
import { passingProfile } from "../fixtures/synthetic-rules";

describe("CSV", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+372 555")).toBe("'+372 555");
  });
  it("writes a BOM and CRLF rows", () => {
    expect(toCsv(["a"], [[1]])).toBe("﻿a\r\n1\r\n");
  });
});

describe("lead snapshot", () => {
  it("contains all three outcomes, rule versions, missing questions and a provisional warning", () => {
    const profile = passingProfile();
    const evaluation = evaluate(profile, []);
    const dto = {
      id: "00000000-0000-0000-0000-000000000000",
      title: "T",
      stage: "result",
      carrierType: "excavator",
      manufacturer: "Test",
      model: "T9",
      year: 2022,
      updatedAt: "",
      createdAt: "",
      initialInput: "my T9",
      identityConfirmed: true,
      unitSystem: "metric",
      questionsAsked: 0,
      specs: Object.values(profile.specs).map((s) => ({ ...s!, enteredValue: null, enteredUnit: null, source: null, updatedAt: "" })),
      evaluation,
      research: null,
      messages: [],
      next: { kind: "done", answered: 13, total: 13 },
      capabilities: { ai: false, research: false, questionsRemaining: 5 },
    } as AssessmentDTO;
    const s = buildLeadSnapshot(dto, "test");
    expect(s.results.map((r) => r.productId)).toEqual(["sc400", "sc600", "sc850pro"]);
    expect(s.results.every((r) => r.verified === "insufficient_data")).toBe(true);
    expect(s.warning).toMatch(/not an installation approval/);
    expect(s.appEnv).toBe("test");
  });
});

describe("approval file schema", () => {
  const base = {
    ruleSetVersion: "approved-2027-01-15",
    description: "Approved by manufacturer",
    approvedBy: "Jane Engineer",
    approvedAt: "2027-01-15",
    sourceDocument: "SC600 installation manual rev B",
    requirements: [
      { productId: "sc600", carrierType: "excavator", parameter: "aux_flow_lpm", min: 65, max: 150, ruleKind: "hard_limit", unit: "L/min", sourceUrl: "https://www.dipperfox.com/manual.pdf", sourceTitle: "Manual", sourceRevision: "B", checkedAt: "2027-01-10" },
    ],
  };
  it("accepts a complete file", () => {
    expect(approvalFileSchema.safeParse(base).success).toBe(true);
  });
  it("refuses missing approver, synthetic versions and remedies without source", () => {
    expect(approvalFileSchema.safeParse({ ...base, approvedBy: "" }).success).toBe(false);
    expect(approvalFileSchema.safeParse({ ...base, ruleSetVersion: "approved-synthetic-1" }).success).toBe(false);
    expect(approvalFileSchema.safeParse({ ...base, requirements: [{ ...base.requirements[0], remedyKind: "adapter" }] }).success).toBe(false);
  });
});
