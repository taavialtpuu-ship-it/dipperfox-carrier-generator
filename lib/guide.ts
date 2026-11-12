/**
 * Deterministic "next question" logic (no LLM). Chooses the highest-value unanswered
 * field for the current carrier type. Any field can be deferred with "I don't know".
 */
import { type CarrierType, type FieldKey, type MachineProfile, FIELDS, fieldsFor } from "./domain";

export type NextStep =
  | { kind: "describe_machine" }
  | { kind: "confirm_identity" }
  | { kind: "field"; field: FieldKey; answered: number; total: number }
  | { kind: "waiting_research"; answered: number; total: number }
  | { kind: "done"; answered: number; total: number };

/** Questions that wait while web research runs: what research may find, and what depends on it. */
export const RESEARCH_DEPENDENT: FieldKey[] = [
  ...(Object.values(FIELDS).filter((f) => f.researchable).map((f) => f.key) as FieldKey[]),
  "flow_pressure_simultaneous",
  "flow_adjustable",
  "pressure_adjustable",
];

export function nextStep(profile: MachineProfile, skipped: FieldKey[] = [], opts: { researchRunning?: boolean } = {}): NextStep {
  if (!profile.carrierType && !profile.manufacturer && !profile.model) return { kind: "describe_machine" };
  if (!profile.identityConfirmed) return { kind: "confirm_identity" };
  const fields = fieldsFor(profile.carrierType as CarrierType);
  const answered = fields.filter((f) => profile.specs[f.key]).length;
  const open = fields.filter((f) => !profile.specs[f.key] && !skipped.includes(f.key));
  if (opts.researchRunning) {
    const now = open.find((f) => !RESEARCH_DEPENDENT.includes(f.key));
    if (now) return { kind: "field", field: now.key, answered, total: fields.length };
    if (open.length) return { kind: "waiting_research", answered, total: fields.length };
  }
  const next = open[0];
  if (!next) return { kind: "done", answered, total: fields.length };
  return { kind: "field", field: next.key, answered, total: fields.length };
}

/** Core fields that make a preliminary comparison meaningful. */
export const CORE_FIELDS: FieldKey[] = ["operating_weight_t", "engine_power_kw", "aux_flow_lpm", "aux_pressure_bar"];

/** "assessment_completed" = identity confirmed and every core field answered (value or "unknown"). */
export function isCoreComplete(profile: MachineProfile): boolean {
  return profile.identityConfirmed && CORE_FIELDS.every((f) => !!profile.specs[f]);
}
