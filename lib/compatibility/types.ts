import type { FieldKey, ProductId } from "../domain";
import type { Dimension } from "../units";

export const ENGINE_VERSION = "engine-1.0.0";

/** A product requirement as the engine sees it (from DB or test fixtures). */
export interface Requirement {
  id: string;
  productId: string;
  productRevision?: string | null;
  carrierType: string;
  parameter: RequirementParameter;
  min?: number | null;
  max?: number | null;
  value?: number | null;
  allowedValues?: string[];
  ruleKind: "hard_limit" | "recommended_range" | "unclassified";
  unit: string;
  status: "draft" | "conflicting" | "approved" | "superseded";
  conflictGroup?: string | null;
  sourceRef?: string | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  remedyKind?: "regulated_setting" | "adapter" | "installation_kit" | null;
  remedyDescription?: string | null;
  remedySourceUrl?: string | null;
  note?: string | null;
  ruleSetVersion: string;
}

export type RequirementParameter =
  | "carrier_weight_t"
  | "engine_power_kw_min"
  | "engine_power_kw_range"
  | "engine_power_kw"
  | "aux_flow_lpm"
  | "aux_pressure_bar"
  | "tool_mass_kg"
  | "coupler_type"
  | "tiltrotator_allowed"
  | "bidirectional_aux_required"
  | "free_return_required"
  | "case_drain_required";

/** Strict (final) outcomes. */
export type StrictStatus = "compatible" | "conditional" | "insufficient_data" | "incompatible";
export type CheckOutcome = "pass" | "conditional" | "insufficient" | "fail" | "not_applicable";

/** Preliminary (non-binding) outcomes against published draft reference data. */
export type PreliminaryStatus = "within_range" | "outside_range" | "cannot_compare";
export type PrelimOutcome =
  | "within"
  | "within_adjustable"
  | "outside"
  | "above_check_adjustable"
  | "sources_disagree"
  | "missing"
  | "no_data";

export type CheckKey =
  | "carrier_type_rules"
  | "operating_weight"
  | "engine_power"
  | "aux_flow"
  | "aux_pressure"
  | "simultaneous_operating_point"
  | "mounting"
  | "bidirectional_aux"
  | "free_return"
  | "case_drain"
  | "tool_mass_vs_lift"
  | "working_position_stability";

export interface RefRange {
  min: number | null;
  max: number | null;
  value: number | null;
  sourceRef: string | null;
  sourceUrl: string | null;
  status: Requirement["status"];
  ruleKind: Requirement["ruleKind"];
  note: string | null;
}

export interface StrictCheck {
  key: CheckKey;
  outcome: CheckOutcome;
  /** Machine-readable reason code; English text comes from lib/compatibility/explain.ts. */
  code: string;
  field: FieldKey | null;
  dimension: Dimension | null;
  actual: number | string | null;
  required: RefRange[];
  remedy: string | null;
}

export interface PrelimCheck {
  key: "operating_weight" | "engine_power" | "aux_flow" | "aux_pressure";
  outcome: PrelimOutcome;
  field: FieldKey;
  dimension: Dimension;
  actual: number | null;
  references: RefRange[];
  /** Non-deciding reference context, e.g. the published power range whose upper bound is not a ban. */
  context?: RefRange[];
  /** Extra non-binding notes, e.g. above published upper power bound. */
  notes: string[];
}

export interface ProductEvaluation {
  productId: ProductId;
  strict: { status: StrictStatus; checks: StrictCheck[] };
  preliminary: { status: PreliminaryStatus; checks: PrelimCheck[]; comparedOnly: string[] };
  /** Fields whose answers would unblock the most checks, ordered by importance. */
  missingFields: FieldKey[];
  suitability: "matches_intended_work" | "other_work_profile" | null;
  ruleSetVersions: string[];
}

export interface EvaluationResult {
  engineVersion: string;
  evaluatedAt: string;
  products: ProductEvaluation[];
  /** Exactly one product preliminarily within all core published ranges → named; otherwise null. */
  bestCandidate: ProductId | null;
  allIncompatible: boolean;
}
