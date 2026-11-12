/**
 * Grounding of AI research output — pure, unit-tested. No I/O.
 */
import type { ResearchOutput, RetrievedSource } from "./ai/types";
import { COUPLER_TYPES, FIELDS } from "./domain";
import { findUnit, toCanonical } from "./units";

export function normUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    return `${x.host.replace(/^www\./, "")}${x.pathname.replace(/\/$/, "")}${x.search}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

export const UNIT_ALIASES: Record<string, string> = {
  t: "t", tonne: "t", tonnes: "t", "metric ton": "t", "metric tons": "t",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  "us ton": "short_ton", "us tons": "short_ton", "short ton": "short_ton", "short tons": "short_ton",
  kw: "kW", hp: "hp", bhp: "hp", "net hp": "hp", ps: "", // PS (metric hp) deliberately unsupported
  "l/min": "L/min", lpm: "L/min", "l/m": "L/min", "litres/min": "L/min", "liters/min": "L/min",
  gpm: "gpm", "us gpm": "gpm", "gal/min": "gpm",
  bar: "bar", psi: "psi", mpa: "MPa",
};

/**
 * Validate and normalise model-proposed candidates. A candidate survives only if its
 * source URL is one of the pages actually retrieved in this research run, its unit is
 * recognised and its canonical value is plausible. Nothing is auto-applied: candidates
 * are suggestions the user must confirm.
 */
export function groundCandidates(out: ResearchOutput, retrieved: RetrievedSource[]) {
  const byUrl = new Map(retrieved.map((r) => [normUrl(r.url), r]));
  const accepted: Array<{
    field: string;
    valueCanonical: number | null;
    valueText: string | null;
    originalValue: string;
    originalUnit: string | null;
    meaning: string;
    appliesTo: string | null;
    confidence: string;
    source: { url: string; title: string | null; origin: string; excerpt: string; locator: string | null };
  }> = [];
  const rejected: string[] = [];
  for (const c of out.candidates) {
    const src = byUrl.get(normUrl(c.sourceUrl));
    if (!src) {
      rejected.push(`${c.field}:source_not_retrieved`);
      continue;
    }
    const def = FIELDS[c.field];
    let valueCanonical: number | null = null;
    let valueText: string | null = null;
    let unitId: string | null = null;
    if (def.kind === "number" && def.dimension) {
      if (c.value == null || !Number.isFinite(c.value)) {
        rejected.push(`${c.field}:no_value`);
        continue;
      }
      unitId = UNIT_ALIASES[(c.unit ?? "").trim().toLowerCase()] ?? null;
      if (!unitId || !findUnit(def.dimension, unitId)) {
        rejected.push(`${c.field}:unit:${c.unit}`);
        continue;
      }
      valueCanonical = toCanonical(c.value, def.dimension, unitId);
      if (def.sanity && (valueCanonical < def.sanity[0] || valueCanonical > def.sanity[1])) {
        rejected.push(`${c.field}:implausible`);
        continue;
      }
    } else {
      const v = (c.valueText ?? "").toLowerCase().replace(/[^a-z_]/g, "_");
      valueText = (COUPLER_TYPES as readonly string[]).find((x) => v.includes(x.replace(/_/g, "")) || v === x) ?? null;
      if (!valueText) {
        rejected.push(`${c.field}:unmapped_value`);
        continue;
      }
    }
    // If the page text is available, require the number to appear in it.
    if (src.text && c.value != null) {
      const digits = String(c.value).replace(/\.0+$/, "");
      const compact = src.text.replace(/[\s, ]/g, "");
      if (!compact.includes(digits.replace(/[\s,]/g, ""))) {
        rejected.push(`${c.field}:value_not_in_page`);
        continue;
      }
    }
    accepted.push({
      field: c.field,
      valueCanonical,
      valueText,
      originalValue: c.value != null ? String(c.value) : (c.valueText ?? ""),
      originalUnit: c.unit,
      meaning: c.meaning.slice(0, 300),
      appliesTo: c.appliesTo?.slice(0, 200) ?? null,
      confidence: c.confidence,
      source: {
        url: src.url,
        title: (c.sourceTitle ?? src.title)?.slice(0, 200) ?? null,
        origin: c.sourceType,
        excerpt: c.excerpt.slice(0, 300),
        locator: c.locator?.slice(0, 120) ?? null,
      },
    });
  }
  return { accepted, rejected };
}

