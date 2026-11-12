/**
 * Shared domain vocabulary: carrier types, machine fields, spec states.
 * All user-facing strings live in lib/i18n/en.ts; this file holds keys and structure.
 */
import type { Dimension } from "./units";

export const CARRIER_TYPES = [
  "excavator",
  "long_reach_excavator",
  "backhoe_loader",
  "skid_steer",
  "compact_loader",
  "other",
] as const;
export type CarrierType = (typeof CARRIER_TYPES)[number];

/** Rule-applicability: a long-reach excavator is an excavator plus a mandatory stability check. */
export function ruleCarrierTypes(t: CarrierType): string[] {
  return t === "long_reach_excavator" ? ["long_reach_excavator", "excavator"] : [t];
}

export const PRODUCT_IDS = ["sc400", "sc600", "sc850pro"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export const YES_NO_UNKNOWN = ["yes", "no", "unknown"] as const;

export const COUPLER_TYPES = [
  "pin_on",
  "s_type",
  "oilquick",
  "lehnhoff",
  "steelwrist_sq",
  "ccr_cw",
  "universal_skid_steer_plate",
  "other",
] as const;

export const ADAPTER_SETUPS = ["none", "adapter_plate", "tiltrotator", "other"] as const;

export const INTENDED_WORK = ["small_landscaping", "medium_site_prep", "heavy_forestry", "not_sure"] as const;

export type FieldKind = "number" | "choice";
export type FieldGroup = "machine" | "hydraulics" | "connections" | "mounting" | "lifting" | "task";

export interface FieldDef {
  key: FieldKey;
  kind: FieldKind;
  group: FieldGroup;
  dimension?: Dimension;
  options?: readonly string[];
  /** Asked only for these carrier types (undefined = all). */
  onlyFor?: CarrierType[];
  /** Lower = asked earlier. */
  priority: number;
  /** Plausible canonical bounds for input validation (not compatibility limits). */
  sanity?: [number, number];
  /** Web research may suggest this field. */
  researchable?: boolean;
}

export const FIELD_KEYS = [
  "operating_weight_t",
  "engine_power_kw",
  "aux_flow_lpm",
  "aux_pressure_bar",
  "flow_pressure_simultaneous",
  "flow_adjustable",
  "pressure_adjustable",
  "hydraulic_package",
  "coupler_type",
  "adapter_setup",
  "bidirectional_aux",
  "free_return_line",
  "case_drain_line",
  "permissible_tool_mass_kg",
  "working_position_stability",
  "intended_work",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELDS: Record<FieldKey, FieldDef> = {
  operating_weight_t: { key: "operating_weight_t", kind: "number", group: "machine", dimension: "mass_t", priority: 10, sanity: [0.3, 200], researchable: true },
  engine_power_kw: { key: "engine_power_kw", kind: "number", group: "machine", dimension: "power", priority: 20, sanity: [3, 1500], researchable: true },
  aux_flow_lpm: { key: "aux_flow_lpm", kind: "number", group: "hydraulics", dimension: "flow", priority: 30, sanity: [1, 1000], researchable: true },
  aux_pressure_bar: { key: "aux_pressure_bar", kind: "number", group: "hydraulics", dimension: "pressure", priority: 40, sanity: [10, 700], researchable: true },
  flow_pressure_simultaneous: { key: "flow_pressure_simultaneous", kind: "choice", group: "hydraulics", options: YES_NO_UNKNOWN, priority: 50 },
  flow_adjustable: { key: "flow_adjustable", kind: "choice", group: "hydraulics", options: YES_NO_UNKNOWN, priority: 60 },
  pressure_adjustable: { key: "pressure_adjustable", kind: "choice", group: "hydraulics", options: YES_NO_UNKNOWN, priority: 65 },
  hydraulic_package: { key: "hydraulic_package", kind: "choice", group: "hydraulics", options: ["standard", "high_flow", "hammer_line_only", "unknown"], priority: 70 },
  coupler_type: { key: "coupler_type", kind: "choice", group: "mounting", options: COUPLER_TYPES, priority: 80, researchable: true },
  adapter_setup: { key: "adapter_setup", kind: "choice", group: "mounting", options: ADAPTER_SETUPS, priority: 85 },
  bidirectional_aux: { key: "bidirectional_aux", kind: "choice", group: "connections", options: YES_NO_UNKNOWN, priority: 90 },
  free_return_line: { key: "free_return_line", kind: "choice", group: "connections", options: YES_NO_UNKNOWN, priority: 100 },
  case_drain_line: { key: "case_drain_line", kind: "choice", group: "connections", options: YES_NO_UNKNOWN, priority: 110 },
  permissible_tool_mass_kg: { key: "permissible_tool_mass_kg", kind: "number", group: "lifting", dimension: "mass_kg", priority: 120, sanity: [10, 20000] },
  working_position_stability: { key: "working_position_stability", kind: "choice", group: "lifting", options: YES_NO_UNKNOWN, onlyFor: ["long_reach_excavator"], priority: 125 },
  intended_work: { key: "intended_work", kind: "choice", group: "task", options: INTENDED_WORK, priority: 130 },
};

export function fieldsFor(carrierType: CarrierType | null | undefined): FieldDef[] {
  return Object.values(FIELDS)
    .filter((f) => !f.onlyFor || (carrierType != null && f.onlyFor.includes(carrierType)))
    .sort((a, b) => a.priority - b.priority);
}

/** How a carrier value was established. */
export type SpecState = "user_entered" | "user_confirmed" | "marked_unknown";
/** Origin of a value. found_online is never a state on its own: online values are suggestions until confirmed. */
export type SpecOrigin = "user_entry" | "official_manual" | "official_site" | "dealer" | "other_web";

export interface SpecValue {
  field: FieldKey;
  state: SpecState;
  valueCanonical: number | null;
  valueText: string | null;
  enteredValue?: string | null;
  enteredUnit?: string | null;
  origin: SpecOrigin;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
}

/** A value counts as verified for the strict engine only if the user entered or confirmed it. */
export function isVerified(v: SpecValue | undefined): v is SpecValue {
  return !!v && (v.state === "user_entered" || v.state === "user_confirmed");
}

export interface MachineProfile {
  carrierType: CarrierType | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  identityConfirmed: boolean;
  specs: Partial<Record<FieldKey, SpecValue>>;
}
