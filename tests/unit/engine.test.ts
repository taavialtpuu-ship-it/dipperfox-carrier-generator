import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/compatibility/engine";
import type { Requirement } from "@/lib/compatibility/types";
import { DRAFT_REQUIREMENTS, SOURCES } from "@/data/products";
import { toCanonical } from "@/lib/units";
import { passingProfile, spec, syntheticApproved } from "../fixtures/synthetic-rules";

const sc600 = (r: ReturnType<typeof evaluate>) => r.products.find((p) => p.productId === "sc600")!;
const checkOf = (r: ReturnType<typeof evaluate>, key: string) => sc600(r).strict.checks.find((c) => c.key === key)!;

const draftReqs: Requirement[] = DRAFT_REQUIREMENTS.map((r) => ({
  id: r.key,
  productId: r.productId,
  carrierType: r.carrierType,
  parameter: r.parameter as Requirement["parameter"],
  min: r.min ?? null,
  max: r.max ?? null,
  value: r.value ?? null,
  ruleKind: r.ruleKind,
  unit: r.unit,
  status: r.status,
  conflictGroup: r.conflictGroup ?? null,
  sourceRef: r.sourceRef,
  sourceUrl: SOURCES[r.sourceRef].url,
  ruleSetVersion: "draft",
}));

describe("strict engine with synthetic approved rules", () => {
  it("fully verified passing configuration → compatible", () => {
    expect(sc600(evaluate(passingProfile(), syntheticApproved())).strict.status).toBe("compatible");
  });

  it("exact lower and upper boundaries pass (inclusive, no tolerance)", () => {
    const p = passingProfile();
    p.specs.operating_weight_t = spec("operating_weight_t", 6);
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 150);
    p.specs.aux_pressure_bar = spec("aux_pressure_bar", 150);
    p.specs.permissible_tool_mass_kg = spec("permissible_tool_mass_kg", 320);
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("compatible");
  });

  it("a hair outside a boundary fails — no automatic tolerance", () => {
    const p = passingProfile();
    p.specs.operating_weight_t = spec("operating_weight_t", 5.9999);
    const r = evaluate(p, syntheticApproved());
    expect(checkOf(r, "operating_weight").outcome).toBe("fail");
    expect(sc600(r).strict.status).toBe("incompatible");
  });

  it("verified inability to meet an approved minimum → incompatible", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 40);
    const r = evaluate(p, syntheticApproved());
    expect(checkOf(r, "aux_flow").code).toBe("below_approved_minimum");
    expect(sc600(r).strict.status).toBe("incompatible");
  });

  it("hard failure wins even when unrelated information is missing", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 40);
    delete p.specs.case_drain_line;
    delete p.specs.coupler_type;
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("incompatible");
  });

  it("missing mandatory evidence → insufficient_data", () => {
    const p = passingProfile();
    delete p.specs.engine_power_kw;
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("insufficient_data");
  });

  it("value marked unknown is not treated as zero", () => {
    const p = passingProfile();
    p.specs.aux_pressure_bar = { ...spec("aux_pressure_bar", 0), valueCanonical: null, state: "marked_unknown" };
    const r = evaluate(p, syntheticApproved());
    expect(checkOf(r, "aux_pressure").code).toBe("value_marked_unknown");
    expect(sc600(r).strict.status).toBe("insufficient_data");
  });

  it("flow and pressure each adequate but no evidence of simultaneous delivery → insufficient", () => {
    const p = passingProfile();
    p.specs.flow_pressure_simultaneous = spec("flow_pressure_simultaneous", "unknown");
    const r = evaluate(p, syntheticApproved());
    expect(checkOf(r, "aux_flow").outcome).toBe("pass");
    expect(checkOf(r, "aux_pressure").outcome).toBe("pass");
    expect(checkOf(r, "simultaneous_operating_point").outcome).toBe("insufficient");
    expect(sc600(r).strict.status).toBe("insufficient_data");
  });

  it("flow above max + adjustable + documented regulated setting → conditional", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 180);
    const reqs = syntheticApproved({ f: { remedyKind: "regulated_setting", remedyDescription: "Limit flow to ≤150 L/min per installation guide." } });
    const r = evaluate(p, reqs);
    expect(checkOf(r, "aux_flow").outcome).toBe("conditional");
    expect(sc600(r).strict.status).toBe("conditional");
  });

  it("flow above max + adjustable but NO documented solution → insufficient, not conditional", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 180);
    const r = evaluate(p, syntheticApproved());
    expect(checkOf(r, "aux_flow").code).toBe("above_max_adjustable_no_documented_procedure");
    expect(sc600(r).strict.status).toBe("insufficient_data");
  });

  it("flow above max and verified not adjustable → incompatible", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 180);
    p.specs.flow_adjustable = spec("flow_adjustable", "no");
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("incompatible");
  });

  it("missing case-drain requirement → insufficient (never assumed not needed)", () => {
    const reqs = syntheticApproved().filter((r) => r.parameter !== "case_drain_required");
    const r = evaluate(passingProfile(), reqs);
    expect(checkOf(r, "case_drain").code).toBe("line_requirement_unknown");
    expect(sc600(r).strict.status).toBe("insufficient_data");
  });

  it("required case drain with unknown presence → insufficient; absent → incompatible", () => {
    const p = passingProfile();
    p.specs.case_drain_line = spec("case_drain_line", "unknown");
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("insufficient_data");
    p.specs.case_drain_line = spec("case_drain_line", "no");
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("incompatible");
  });

  it("conflicting requirement cannot create a definitive pass or fail", () => {
    const reqs = syntheticApproved().filter((r) => r.parameter !== "carrier_weight_t");
    reqs.push(
      { id: "c1", productId: "sc600", carrierType: "excavator", parameter: "carrier_weight_t", min: 6, max: 12, ruleKind: "hard_limit", unit: "t", status: "conflicting", conflictGroup: "g", ruleSetVersion: "x" },
      { id: "c2", productId: "sc600", carrierType: "excavator", parameter: "carrier_weight_t", min: 2, max: 14, ruleKind: "hard_limit", unit: "t", status: "conflicting", conflictGroup: "g", ruleSetVersion: "x" },
    );
    const p = passingProfile();
    p.specs.operating_weight_t = spec("operating_weight_t", 4); // outside one, inside the other
    const r = evaluate(p, reqs);
    expect(checkOf(r, "operating_weight").outcome).toBe("insufficient");
    expect(sc600(r).strict.status).toBe("insufficient_data");
  });

  it("standalone approved hard failure is not overridden by an unrelated conflict", () => {
    const reqs = syntheticApproved().filter((r) => r.parameter !== "carrier_weight_t");
    reqs.push({ id: "c1", productId: "sc600", carrierType: "excavator", parameter: "carrier_weight_t", min: 6, max: 12, ruleKind: "hard_limit", unit: "t", status: "conflicting", ruleSetVersion: "x" });
    const p = passingProfile();
    p.specs.aux_pressure_bar = spec("aux_pressure_bar", 100);
    expect(sc600(evaluate(p, reqs)).strict.status).toBe("incompatible");
  });

  it("an excavator rule is not applied to a skid steer", () => {
    const p = { ...passingProfile(), carrierType: "skid_steer" as const };
    const r = evaluate(p, syntheticApproved());
    expect(checkOf(r, "carrier_type_rules").code).toBe("no_approved_rules_for_type");
    expect(checkOf(r, "operating_weight").code).toBe("no_approved_requirement");
    expect(sc600(r).strict.status).toBe("insufficient_data");
  });

  it("unconfirmed online value does not count as verified", () => {
    const p = passingProfile();
    p.specs.engine_power_kw = { ...spec("engine_power_kw", 50), state: "marked_unknown", valueCanonical: null };
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("insufficient_data");
  });

  it("long-reach excavator needs stability confirmation", () => {
    const p = { ...passingProfile(), carrierType: "long_reach_excavator" as const };
    const r1 = evaluate(p, syntheticApproved());
    expect(sc600(r1).strict.status).toBe("insufficient_data");
    p.specs.working_position_stability = spec("working_position_stability", "yes");
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("compatible");
  });

  it("US units give the same outcome after normalisation", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", toCanonical(26.4172052, "flow", "gpm")); // ≈ 100 L/min
    p.specs.aux_pressure_bar = spec("aux_pressure_bar", toCanonical(2900.75476, "pressure", "psi")); // ≈ 200 bar
    p.specs.operating_weight_t = spec("operating_weight_t", toCanonical(9.92080179, "mass_t", "short_ton")); // ≈ 9 t
    p.specs.engine_power_kw = spec("engine_power_kw", toCanonical(67.0511, "power", "hp")); // ≈ 50 kW
    expect(sc600(evaluate(p, syntheticApproved())).strict.status).toBe("compatible");
  });
});

describe("real draft v0.1 data", () => {
  it("never yields a final compatible/incompatible on its own", () => {
    const p = passingProfile();
    const r = evaluate(p, draftReqs);
    for (const prod of r.products) expect(prod.strict.status).toBe("insufficient_data");
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 5);
    for (const prod of evaluate(p, draftReqs).products) expect(prod.strict.status).toBe("insufficient_data");
  });

  it("9 t excavator: SC 600 preliminarily within range; SC 400 and SC 850 Pro outside", () => {
    const p = passingProfile();
    const r = evaluate(p, draftReqs);
    expect(sc600(r).preliminary.status).toBe("within_range");
    expect(r.products.find((x) => x.productId === "sc400")!.preliminary.status).toBe("outside_range");
    expect(r.products.find((x) => x.productId === "sc850pro")!.preliminary.status).toBe("outside_range");
    expect(r.bestCandidate).toBe("sc600");
  });

  it("SC 400 mass conflict: value inside one source but not the other → sources disagree", () => {
    const p = passingProfile();
    p.specs.operating_weight_t = spec("operating_weight_t", 1.2); // within 1–5 (S5/S6) but not 1.5–5 (S1)
    const r = evaluate(p, draftReqs);
    const sc400 = r.products.find((x) => x.productId === "sc400")!;
    expect(sc400.preliminary.checks.find((c) => c.key === "operating_weight")!.outcome).toBe("sources_disagree");
  });

  it("SC 400 skid steer: mass compared only, never 'within range' headline", () => {
    const p = { ...passingProfile(), carrierType: "skid_steer" as const };
    p.specs.operating_weight_t = spec("operating_weight_t", 2);
    const r = evaluate(p, draftReqs);
    const sc400 = r.products.find((x) => x.productId === "sc400")!;
    expect(sc400.preliminary.comparedOnly).toEqual(["operating_weight"]);
    expect(sc400.preliminary.status).toBe("cannot_compare");
    expect(sc600(r).preliminary.comparedOnly).toEqual([]);
  });

  it("power above published upper bound is a note, not an exclusion", () => {
    const p = passingProfile();
    p.specs.engine_power_kw = spec("engine_power_kw", 90); // above SC 600's 35–74 range
    const r = evaluate(p, draftReqs);
    const pw = sc600(r).preliminary.checks.find((c) => c.key === "engine_power")!;
    expect(pw.outcome).toBe("within");
    expect(pw.notes).toContain("above_published_power_range");
  });

  it("flow above published max with unknown adjustability → cannot compare, not outside", () => {
    const p = passingProfile();
    p.specs.aux_flow_lpm = spec("aux_flow_lpm", 170);
    p.specs.flow_adjustable = spec("flow_adjustable", "unknown");
    expect(sc600(evaluate(p, draftReqs)).preliminary.status).toBe("cannot_compare");
  });
});
