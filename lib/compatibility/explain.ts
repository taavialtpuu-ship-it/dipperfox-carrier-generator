/**
 * Template-based explanation layer. Turns deterministic results into plain English.
 * It never changes an outcome and never calls an LLM.
 */
import { t } from "../i18n/en";
import { type UnitSystem, formatCanonical, formatRange } from "../units";
import type { PrelimCheck, ProductEvaluation, RefRange, StrictCheck } from "./types";

export function refText(r: RefRange, check: { dimension: PrelimCheck["dimension"] | null }, units: UnitSystem): string {
  if (!check.dimension) return r.value != null ? String(r.value) : "—";
  const v = r.value != null ? formatCanonical(r.value, check.dimension, units) : formatRange(r.min, r.max, check.dimension, units);
  return r.sourceRef ? `${v} (${r.sourceRef})` : v;
}

export function actualText(c: { actual: number | string | null; dimension: PrelimCheck["dimension"] | null }, units: UnitSystem): string {
  if (c.actual == null) return "—";
  if (typeof c.actual === "string") return t.options[c.actual] ?? c.actual;
  return c.dimension ? formatCanonical(c.actual, c.dimension, units) : String(c.actual);
}

/** Top 2–3 reasons for the preliminary headline, most important first. */
export function preliminaryReasons(p: ProductEvaluation, units: UnitSystem): string[] {
  const out: string[] = [];
  const label = (c: PrelimCheck) => t.checks[c.key];
  const pub = (c: PrelimCheck) => c.references.map((r) => refText(r, c, units));
  for (const c of p.preliminary.checks.filter((x) => x.outcome === "outside"))
    out.push(`${label(c)}: ${actualText(c, units)} is outside the published ${uniq(pub(c)).join(" / ")}.`);
  for (const c of p.preliminary.checks.filter((x) => x.outcome === "sources_disagree"))
    out.push(`${label(c)}: ${actualText(c, units)} fits one Dipperfox source but not another (${uniq(pub(c)).join(" vs ")}).`);
  for (const c of p.preliminary.checks.filter((x) => x.outcome === "above_check_adjustable"))
    out.push(`${label(c)}: ${actualText(c, units)} is above the published range — tell us whether it can be adjusted.`);
  const missing = p.preliminary.checks.filter((x) => x.outcome === "missing");
  if (missing.length) out.push(`Still needed: ${missing.map(label).join(", ").toLowerCase()}.`);
  if (p.preliminary.comparedOnly.length === 0) out.push("Dipperfox has not published reference figures for this carrier type.");
  else if (p.preliminary.checks.some((c) => c.outcome === "no_data")) out.push(t.prelim.comparedOnlyMass);
  if (p.preliminary.status === "within_range") {
    out.unshift("Weight, engine power, flow and pressure are all within the published reference figures.");
    for (const c of p.preliminary.checks.filter((x) => x.outcome === "within_adjustable"))
      out.push(`${label(c)} is above the published range; the adjustable setting must be verified.`);
    for (const c of p.preliminary.checks) if (c.notes.includes("above_published_power_range")) out.push(t.prelim.above_published_power_range);
  }
  return out.slice(0, 3);
}

export function strictReason(c: StrictCheck): string {
  return t.codes[c.code] ?? c.code;
}

function uniq(a: string[]) {
  return [...new Set(a)];
}
