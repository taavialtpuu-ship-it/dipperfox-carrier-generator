/**
 * SYNTHETIC, TEST-ONLY approved requirements. Internally consistent, invented values
 * used to prove the four-status engine. Never imported by application code or seeds.
 */
import type { Requirement } from "@/lib/compatibility/types";
import type { FieldKey, MachineProfile, SpecValue } from "@/lib/domain";

const base = {
  productId: "sc600",
  carrierType: "excavator",
  status: "approved" as const,
  ruleKind: "hard_limit" as const,
  ruleSetVersion: "synthetic-test-1",
  sourceRef: "SYNTHETIC",
};

export function syntheticApproved(overrides: Partial<Record<string, Partial<Requirement>>> = {}): Requirement[] {
  const rules: Requirement[] = [
    { ...base, id: "w", parameter: "carrier_weight_t", min: 6, max: 12, unit: "t" },
    { ...base, id: "p", parameter: "engine_power_kw", min: 35, unit: "kW" },
    { ...base, id: "f", parameter: "aux_flow_lpm", min: 65, max: 150, unit: "L/min" },
    { ...base, id: "pr", parameter: "aux_pressure_bar", min: 150, max: 250, unit: "bar" },
    { ...base, id: "c", parameter: "coupler_type", allowedValues: ["s_type", "pin_on"], unit: "enum" },
    { ...base, id: "bi", parameter: "bidirectional_aux_required", value: 0, unit: "bool" },
    { ...base, id: "fr", parameter: "free_return_required", value: 1, unit: "bool" },
    { ...base, id: "cd", parameter: "case_drain_required", value: 1, unit: "bool" },
    { ...base, id: "m", parameter: "tool_mass_kg", value: 320, unit: "kg" },
  ];
  return rules.map((r) => ({ ...r, ...(overrides[r.id] ?? {}) }));
}

export function spec(field: FieldKey, v: number | string, state: SpecValue["state"] = "user_entered"): SpecValue {
  return {
    field,
    state,
    valueCanonical: typeof v === "number" ? v : null,
    valueText: typeof v === "string" ? v : null,
    origin: "user_entry",
  };
}

/** A fully verified 9 t excavator that passes every synthetic SC 600 rule. */
export function passingProfile(): MachineProfile {
  const specs: MachineProfile["specs"] = {};
  const put = (s: SpecValue) => (specs[s.field] = s);
  put(spec("operating_weight_t", 9));
  put(spec("engine_power_kw", 50));
  put(spec("aux_flow_lpm", 100));
  put(spec("aux_pressure_bar", 200));
  put(spec("flow_pressure_simultaneous", "yes"));
  put(spec("flow_adjustable", "yes"));
  put(spec("pressure_adjustable", "yes"));
  put(spec("coupler_type", "s_type"));
  put(spec("adapter_setup", "none"));
  put(spec("bidirectional_aux", "no"));
  put(spec("free_return_line", "yes"));
  put(spec("case_drain_line", "yes"));
  put(spec("permissible_tool_mass_kg", 900));
  return { carrierType: "excavator", manufacturer: "Test", model: "T9", year: 2022, identityConfirmed: true, specs };
}
