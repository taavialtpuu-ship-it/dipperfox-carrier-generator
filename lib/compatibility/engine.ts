/**
 * Deterministic compatibility engine. PURE: no I/O, no LLM, no clock except the
 * optional `now` argument. Same inputs → same outputs.
 *
 * Two layers:
 *  - strict: only `approved` requirements decide. Missing approvals → insufficient_data.
 *  - preliminary: draft/conflicting published reference values, non-binding.
 *
 * Boundaries are inclusive. No automatic tolerances.
 */
import {
  type CarrierType,
  type FieldKey,
  type MachineProfile,
  type ProductId,
  type SpecValue,
  PRODUCT_IDS,
  isVerified,
  ruleCarrierTypes,
} from "../domain";
import type { Dimension } from "../units";
import {
  ENGINE_VERSION,
  type CheckKey,
  type EvaluationResult,
  type PrelimCheck,
  type PrelimOutcome,
  type PreliminaryStatus,
  type ProductEvaluation,
  type RefRange,
  type Requirement,
  type RequirementParameter,
  type StrictCheck,
  type StrictStatus,
} from "./types";

const toRef = (r: Requirement): RefRange => ({
  min: r.min ?? null,
  max: r.max ?? null,
  value: r.value ?? null,
  sourceRef: r.sourceRef ?? null,
  sourceUrl: r.sourceUrl ?? null,
  status: r.status,
  ruleKind: r.ruleKind,
  note: r.note ?? null,
});

function reqsFor(
  all: Requirement[],
  productId: string,
  carrierType: CarrierType,
  parameter: RequirementParameter,
  statuses: Requirement["status"][],
): Requirement[] {
  const types = ruleCarrierTypes(carrierType);
  const matching = all.filter(
    (r) => r.productId === productId && r.parameter === parameter && statuses.includes(r.status),
  );
  // Prefer the most specific carrier type that has any rule (long-reach rules over excavator rules).
  for (const t of types) {
    const forType = matching.filter((r) => r.carrierType === t);
    if (forType.length) return forType;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Strict layer
// ---------------------------------------------------------------------------

function check(
  key: CheckKey,
  outcome: StrictCheck["outcome"],
  code: string,
  extra: Partial<Omit<StrictCheck, "key" | "outcome" | "code">> = {},
): StrictCheck {
  return {
    key,
    outcome,
    code,
    field: extra.field ?? null,
    dimension: extra.dimension ?? null,
    actual: extra.actual ?? null,
    required: extra.required ?? [],
    remedy: extra.remedy ?? null,
  };
}

function strictRange(
  key: CheckKey,
  parameter: RequirementParameter,
  field: FieldKey,
  dimension: Dimension,
  ctx: Ctx,
  adjustableField?: FieldKey,
): StrictCheck {
  const approved = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, parameter, ["approved"]);
  const base = { field, dimension, required: approved.map(toRef) };
  if (approved.length === 0) return check(key, "insufficient", "no_approved_requirement", base);

  const spec = ctx.specs[field];
  if (!spec || spec.state === "marked_unknown" || spec.valueCanonical == null)
    return check(key, "insufficient", spec?.state === "marked_unknown" ? "value_marked_unknown" : "value_missing", base);
  if (!isVerified(spec)) return check(key, "insufficient", "value_unverified", base);

  const v = spec.valueCanonical;
  const withActual = { ...base, actual: v };
  const outcomes: StrictCheck[] = [];

  for (const r of approved) {
    if (r.ruleKind === "unclassified") {
      outcomes.push(check(key, "insufficient", "requirement_unclassified", withActual));
      continue;
    }
    const below = r.min != null && v < r.min;
    const above = r.max != null && v > r.max;
    if (!below && !above) {
      outcomes.push(check(key, "pass", "within_approved_limit", withActual));
      continue;
    }
    if (r.ruleKind === "recommended_range") {
      // Recommended ranges are not hard prohibitions.
      outcomes.push(check(key, "pass", below ? "below_recommended_range" : "above_recommended_range", withActual));
      continue;
    }
    // Hard limit violated.
    const remedy = r.remedyDescription ?? null;
    if (above && adjustableField) {
      const adj = ctx.specs[adjustableField];
      const adjVal = isVerified(adj) ? adj.valueText : "unknown";
      if (r.remedyKind === "regulated_setting") {
        if (adjVal === "yes") outcomes.push(check(key, "conditional", "above_max_documented_regulation", { ...withActual, remedy }));
        else if (adjVal === "no") outcomes.push(check(key, "fail", "above_max_not_adjustable", withActual));
        else outcomes.push(check(key, "insufficient", "above_max_adjustability_unknown", withActual));
        continue;
      }
      if (r.remedyKind) {
        outcomes.push(check(key, "conditional", "limit_failed_documented_remedy", { ...withActual, remedy }));
        continue;
      }
      if (adjVal === "yes") outcomes.push(check(key, "insufficient", "above_max_adjustable_no_documented_procedure", withActual));
      else if (adjVal === "no") outcomes.push(check(key, "fail", "above_max_not_adjustable", withActual));
      else outcomes.push(check(key, "insufficient", "above_max_adjustability_unknown", withActual));
      continue;
    }
    if (r.remedyKind && r.remedyKind !== "regulated_setting") {
      outcomes.push(check(key, "conditional", "limit_failed_documented_remedy", { ...withActual, remedy }));
      continue;
    }
    outcomes.push(check(key, "fail", below ? "below_approved_minimum" : "above_approved_maximum", withActual));
  }
  return worst(outcomes);
}

const OUTCOME_RANK: Record<StrictCheck["outcome"], number> = {
  fail: 4,
  insufficient: 3,
  conditional: 2,
  pass: 1,
  not_applicable: 0,
};

function worst(checks: StrictCheck[]): StrictCheck {
  return checks.reduce((a, b) => (OUTCOME_RANK[b.outcome] > OUTCOME_RANK[a.outcome] ? b : a));
}

function strictLineRequirement(
  key: CheckKey,
  parameter: RequirementParameter,
  field: FieldKey,
  ctx: Ctx,
): StrictCheck {
  const approved = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, parameter, ["approved"]);
  const base = { field, required: approved.map(toRef) };
  // Whether the line is needed is a model/revision-specific documentation question.
  if (approved.length === 0) return check(key, "insufficient", "line_requirement_unknown", base);
  const required = approved.some((r) => r.value === 1);
  if (!required) return check(key, "pass", "line_not_required_per_approved_docs", base);
  const spec = ctx.specs[field];
  if (!isVerified(spec) || spec.valueText === "unknown" || spec.valueText == null)
    return check(key, "insufficient", "line_presence_unknown", { ...base, actual: spec?.valueText ?? null });
  if (spec.valueText === "yes") return check(key, "pass", "required_line_present", { ...base, actual: "yes" });
  const remedyReq = approved.find((r) => r.remedyKind);
  if (remedyReq)
    return check(key, "conditional", "limit_failed_documented_remedy", { ...base, actual: "no", remedy: remedyReq.remedyDescription ?? null });
  return check(key, "fail", "required_line_absent", { ...base, actual: "no" });
}

function strictMounting(ctx: Ctx): StrictCheck {
  const approved = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, "coupler_type", ["approved"]);
  const base = { field: "coupler_type" as FieldKey, required: approved.map(toRef) };
  if (approved.length === 0) return check("mounting", "insufficient", "no_approved_requirement", base);
  const spec = ctx.specs.coupler_type;
  if (!isVerified(spec) || !spec.valueText) return check("mounting", "insufficient", "value_missing", base);
  const coupler = spec.valueText;
  const adapter = ctx.specs.adapter_setup;
  if (!isVerified(adapter)) return check("mounting", "insufficient", "adapter_setup_unknown", { ...base, actual: coupler });
  if (adapter.valueText === "tiltrotator") {
    const tilt = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, "tiltrotator_allowed", ["approved"]);
    if (tilt.length === 0) return check("mounting", "insufficient", "tiltrotator_requirement_unknown", { ...base, actual: coupler });
    if (!tilt.some((t) => t.value === 1)) return check("mounting", "fail", "tiltrotator_not_allowed", { ...base, actual: coupler });
  }
  const accepted = approved.some((r) => (r.allowedValues ?? []).includes(coupler));
  if (accepted) return check("mounting", "pass", "coupler_supported", { ...base, actual: coupler });
  const remedyReq = approved.find((r) => r.remedyKind === "adapter");
  if (remedyReq)
    return check("mounting", "conditional", "coupler_needs_documented_adapter", { ...base, actual: coupler, remedy: remedyReq.remedyDescription ?? null });
  return check("mounting", "fail", "coupler_not_supported", { ...base, actual: coupler });
}

function strictToolMass(ctx: Ctx): StrictCheck {
  const approved = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, "tool_mass_kg", ["approved"]);
  const base = { field: "permissible_tool_mass_kg" as FieldKey, dimension: "mass_kg" as Dimension, required: approved.map(toRef) };
  if (approved.length === 0 || approved[0].value == null) return check("tool_mass_vs_lift", "insufficient", "no_approved_requirement", base);
  const adapter = ctx.specs.adapter_setup;
  if (!isVerified(adapter)) return check("tool_mass_vs_lift", "insufficient", "adapter_setup_unknown", base);
  if (adapter.valueText !== "none")
    return check("tool_mass_vs_lift", "insufficient", "adapter_mass_unknown", base);
  const spec = ctx.specs.permissible_tool_mass_kg;
  if (!isVerified(spec) || spec.valueCanonical == null)
    return check("tool_mass_vs_lift", "insufficient", spec?.state === "marked_unknown" ? "value_marked_unknown" : "value_missing", base);
  const toolMass = approved[0].value;
  if (spec.valueCanonical >= toolMass) return check("tool_mass_vs_lift", "pass", "lift_capacity_sufficient", { ...base, actual: spec.valueCanonical });
  return check("tool_mass_vs_lift", "fail", "lift_capacity_insufficient", { ...base, actual: spec.valueCanonical });
}

function strictSimultaneous(ctx: Ctx, flow: StrictCheck, pressure: StrictCheck): StrictCheck {
  const base = { field: "flow_pressure_simultaneous" as FieldKey };
  const flowApproved = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, "aux_flow_lpm", ["approved"]).length > 0;
  const pressureApproved = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, "aux_pressure_bar", ["approved"]).length > 0;
  if (!flowApproved || !pressureApproved) return check("simultaneous_operating_point", "insufficient", "no_approved_requirement", base);
  const spec = ctx.specs.flow_pressure_simultaneous;
  // Range overlap is only a candidate operating point, never proof of simultaneous delivery.
  if (!isVerified(spec) || spec.valueText === "unknown" || !spec.valueText)
    return check("simultaneous_operating_point", "insufficient", "simultaneous_unproven", base);
  if (spec.valueText === "no") return check("simultaneous_operating_point", "fail", "simultaneous_not_achievable", { ...base, actual: "no" });
  if (flow.outcome === "fail" || pressure.outcome === "fail")
    return check("simultaneous_operating_point", "not_applicable", "component_check_failed", { ...base, actual: "yes" });
  return check("simultaneous_operating_point", "pass", "simultaneous_confirmed", { ...base, actual: "yes" });
}

interface Ctx {
  productId: ProductId;
  carrierType: CarrierType;
  reqs: Requirement[];
  specs: MachineProfile["specs"];
}

function strictLayer(ctx: Ctx): { status: StrictStatus; checks: StrictCheck[] } {
  const anyApproved = ctx.reqs.some(
    (r) => r.productId === ctx.productId && r.status === "approved" && ruleCarrierTypes(ctx.carrierType).includes(r.carrierType),
  );
  const checks: StrictCheck[] = [];
  checks.push(
    anyApproved
      ? check("carrier_type_rules", "pass", "approved_rules_exist")
      : check("carrier_type_rules", "insufficient", "no_approved_rules_for_type"),
  );
  checks.push(strictRange("operating_weight", "carrier_weight_t", "operating_weight_t", "mass_t", ctx));
  checks.push(strictRange("engine_power", "engine_power_kw", "engine_power_kw", "power", ctx));
  const flow = strictRange("aux_flow", "aux_flow_lpm", "aux_flow_lpm", "flow", ctx, "flow_adjustable");
  const pressure = strictRange("aux_pressure", "aux_pressure_bar", "aux_pressure_bar", "pressure", ctx, "pressure_adjustable");
  checks.push(flow, pressure, strictSimultaneous(ctx, flow, pressure));
  checks.push(strictMounting(ctx));
  checks.push(strictLineRequirement("bidirectional_aux", "bidirectional_aux_required", "bidirectional_aux", ctx));
  checks.push(strictLineRequirement("free_return", "free_return_required", "free_return_line", ctx));
  checks.push(strictLineRequirement("case_drain", "case_drain_required", "case_drain_line", ctx));
  checks.push(strictToolMass(ctx));
  if (ctx.carrierType === "long_reach_excavator") {
    const s = ctx.specs.working_position_stability;
    const base = { field: "working_position_stability" as FieldKey };
    if (!isVerified(s) || s.valueText === "unknown" || !s.valueText)
      checks.push(check("working_position_stability", "insufficient", "stability_unconfirmed", base));
    else if (s.valueText === "no") checks.push(check("working_position_stability", "fail", "stability_not_given", { ...base, actual: "no" }));
    else checks.push(check("working_position_stability", "pass", "stability_confirmed", { ...base, actual: "yes" }));
  }
  return { status: aggregate(checks), checks };
}

/** Aggregate order: fail → insufficient → conditional → compatible. */
export function aggregate(checks: StrictCheck[]): StrictStatus {
  if (checks.some((c) => c.outcome === "fail")) return "incompatible";
  if (checks.length === 0 || checks.some((c) => c.outcome === "insufficient")) return "insufficient_data";
  if (checks.some((c) => c.outcome === "conditional")) return "conditional";
  return "compatible";
}

// ---------------------------------------------------------------------------
// Preliminary layer (non-binding)
// ---------------------------------------------------------------------------

const PRELIM_STATUSES: Requirement["status"][] = ["draft", "conflicting", "approved"];

function inRange(v: number, r: Requirement): "within" | "below" | "above" {
  if (r.min != null && v < r.min) return "below";
  if (r.max != null && v > r.max) return "above";
  return "within";
}

function prelimRange(
  key: PrelimCheck["key"],
  parameter: RequirementParameter,
  field: FieldKey,
  dimension: Dimension,
  ctx: Ctx,
  adjustableField?: FieldKey,
): PrelimCheck {
  const refs = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, parameter, PRELIM_STATUSES);
  const base: PrelimCheck = { key, outcome: "no_data", field, dimension, actual: null, references: refs.map(toRef), notes: [] };
  if (refs.length === 0) return base;
  const spec: SpecValue | undefined = ctx.specs[field];
  if (!isVerified(spec) || spec.valueCanonical == null) return { ...base, outcome: "missing" };
  const v = spec.valueCanonical;
  const positions = refs.map((r) => inRange(v, r));
  let outcome: PrelimOutcome;
  if (positions.every((p) => p === "within")) outcome = "within";
  else if (positions.every((p) => p !== "within")) {
    const above = positions.every((p) => p === "above");
    if (above && adjustableField) {
      const adj = ctx.specs[adjustableField];
      const a = isVerified(adj) ? adj.valueText : "unknown";
      outcome = a === "yes" ? "within_adjustable" : a === "no" ? "outside" : "above_check_adjustable";
    } else outcome = "outside";
  } else outcome = "sources_disagree";
  return { ...base, actual: v, outcome };
}

function prelimPower(ctx: Ctx): PrelimCheck {
  const c = prelimRange("engine_power", "engine_power_kw_min", "engine_power_kw", "power", ctx);
  const range = reqsFor(ctx.reqs, ctx.productId, ctx.carrierType, "engine_power_kw_range", PRELIM_STATUSES);
  const notes = [...c.notes];
  if (c.actual != null && range.some((r) => r.max != null && c.actual! > r.max)) notes.push("above_published_power_range");
  return { ...c, context: range.map(toRef), notes };
}

function preliminaryLayer(ctx: Ctx): ProductEvaluation["preliminary"] {
  const checks: PrelimCheck[] = [
    prelimRange("operating_weight", "carrier_weight_t", "operating_weight_t", "mass_t", ctx),
    prelimPower(ctx),
    prelimRange("aux_flow", "aux_flow_lpm", "aux_flow_lpm", "flow", ctx, "flow_adjustable"),
    prelimRange("aux_pressure", "aux_pressure_bar", "aux_pressure_bar", "pressure", ctx, "pressure_adjustable"),
  ];
  const comparedOnly = checks.filter((c) => c.outcome !== "no_data").map((c) => c.key);
  let status: PreliminaryStatus;
  if (checks.some((c) => c.outcome === "outside")) status = "outside_range";
  else if (checks.every((c) => c.outcome === "within" || c.outcome === "within_adjustable")) status = "within_range";
  else status = "cannot_compare";
  return { status, checks, comparedOnly };
}

// ---------------------------------------------------------------------------
// Missing information and task suitability
// ---------------------------------------------------------------------------

const WORK_TO_PRODUCT: Record<string, ProductId> = {
  small_landscaping: "sc400",
  medium_site_prep: "sc600",
  heavy_forestry: "sc850pro",
};

function missingFields(strict: StrictCheck[], prelim: PrelimCheck[], specs: MachineProfile["specs"]): FieldKey[] {
  const out: FieldKey[] = [];
  const add = (f: FieldKey | null) => {
    if (!f || out.includes(f)) return;
    const s = specs[f];
    if (!s || !isVerified(s) || s.valueText === "unknown") out.push(f);
  };
  for (const c of prelim) if (c.outcome === "missing") add(c.field);
  for (const c of strict) {
    if (c.outcome !== "insufficient") continue;
    if (c.code.startsWith("no_approved") || c.code === "line_requirement_unknown" || c.code === "requirement_unclassified") continue;
    add(c.field);
    if (c.code.includes("adjustability")) add(c.key === "aux_flow" ? "flow_adjustable" : "pressure_adjustable");
    if (c.code === "adapter_setup_unknown") add("adapter_setup");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function evaluate(profile: MachineProfile, requirements: Requirement[], now: Date = new Date()): EvaluationResult {
  const carrierType: CarrierType = profile.carrierType ?? "other";
  const live = requirements.filter((r) => r.status !== "superseded");
  const products: ProductEvaluation[] = PRODUCT_IDS.map((productId) => {
    const ctx: Ctx = { productId, carrierType, reqs: live, specs: profile.specs };
    const strict = strictLayer(ctx);
    const preliminary = preliminaryLayer(ctx);
    const work = profile.specs.intended_work?.valueText;
    const suitability =
      work && WORK_TO_PRODUCT[work] ? (WORK_TO_PRODUCT[work] === productId ? "matches_intended_work" : "other_work_profile") : null;
    const versions = [...new Set(live.filter((r) => r.productId === productId).map((r) => r.ruleSetVersion))].sort();
    return {
      productId,
      strict,
      preliminary,
      missingFields: missingFields(strict.checks, preliminary.checks, profile.specs),
      suitability,
      ruleSetVersions: versions,
    };
  });
  const within = products.filter((p) => p.preliminary.status === "within_range");
  return {
    engineVersion: ENGINE_VERSION,
    evaluatedAt: now.toISOString(),
    products,
    bestCandidate: within.length === 1 ? within[0].productId : null,
    allIncompatible: products.every((p) => p.strict.status === "incompatible"),
  };
}
