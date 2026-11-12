import "server-only";
import type { EvaluationResult } from "../compatibility/types";
import type { MachineProfile } from "../domain";
import { t } from "../i18n/en";
import { formatCanonical } from "../units";
import { FIELDS } from "../domain";
import type { CatalogDTO } from "../dto";

/** Compact, factual context for the question-answering guide. Built from structured state only. */
export function buildGuideContext(profile: MachineProfile, ev: EvaluationResult, catalog: Pick<CatalogDTO, "products" | "requirements">): string {
  const lines: string[] = [];
  lines.push(`Machine: ${profile.manufacturer ?? "?"} ${profile.model ?? "?"} ${profile.year ?? ""} — carrier type ${profile.carrierType ?? "unknown"}.`);
  for (const [k, s] of Object.entries(profile.specs)) {
    if (!s) continue;
    const def = FIELDS[k as keyof typeof FIELDS];
    const v = s.state === "marked_unknown" ? "unknown" : def.dimension && s.valueCanonical != null ? formatCanonical(s.valueCanonical, def.dimension, "metric") : (s.valueText ?? "?");
    lines.push(`- ${t.fields[k as keyof typeof t.fields].label}: ${v} (${s.state})`);
  }
  lines.push("", "Dipperfox published reference figures (source document v0.1, manufacturer approval pending — not certified limits):");
  for (const r of catalog.requirements) {
    const range = r.value != null ? `${r.value}` : `${r.min ?? ""}–${r.max ?? ""}`;
    lines.push(`- ${r.productId} ${r.carrierType} ${r.parameter}: ${range} ${r.unit} [${r.status}, ${r.sourceRef ?? ""}]${r.note ? ` — ${r.note}` : ""}`);
  }
  for (const p of catalog.products) lines.push(`- ${p.name}: cutting diameter ${p.cuttingDiameterMm} mm, grinder mass ${p.massKg} kg, typical use: ${p.suitability}.`);
  lines.push("", "Deterministic assessment results:");
  for (const p of ev.products) {
    lines.push(`- ${p.productId}: preliminary "${t.outcomes.preliminary[p.preliminary.status]}", verified result "${t.outcomes.strict[p.strict.status]}".`);
    for (const c of p.preliminary.checks) lines.push(`  · ${t.checks[c.key]}: ${t.prelim[c.outcome]}`);
  }
  lines.push("", "Term explanations:");
  for (const k of ["aux_flow_lpm", "aux_pressure_bar", "flow_pressure_simultaneous", "case_drain_line", "free_return_line", "bidirectional_aux"] as const)
    lines.push(`- ${t.fields[k].label}: ${t.fields[k].help}`);
  lines.push("Cutting diameter is a tool characteristic, not a maximum stump size; larger stumps can be ground with overlapping passes.");
  return lines.join("\n").slice(0, 12000);
}
