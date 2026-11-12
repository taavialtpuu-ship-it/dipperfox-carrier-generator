/**
 * Deterministic, free parser for what a visitor types about their machine.
 * Pure (no I/O, no AI). It only reads what is literally written: it never guesses a
 * carrier type from a model name and ignores numbers without a recognised unit.
 */
import type { CarrierType, FieldKey } from "../domain";
import { FIELDS } from "../domain";
import { findUnit, toCanonical } from "../units";

/** Canonical manufacturer → lowercase aliases as people type them. */
const MANUFACTURERS: Record<string, string[]> = {
  Caterpillar: ["caterpillar", "cat"],
  Komatsu: ["komatsu"],
  Volvo: ["volvo"],
  JCB: ["jcb"],
  Bobcat: ["bobcat"],
  Kubota: ["kubota"],
  Takeuchi: ["takeuchi"],
  Hitachi: ["hitachi"],
  Develon: ["develon", "doosan"],
  Hyundai: ["hyundai", "hd hyundai"],
  Liebherr: ["liebherr"],
  Case: ["case"],
  "John Deere": ["john deere", "deere"],
  "New Holland": ["new holland"],
  Yanmar: ["yanmar"],
  Kobelco: ["kobelco"],
  Sany: ["sany"],
  XCMG: ["xcmg"],
  LiuGong: ["liugong", "liu gong"],
  "Wacker Neuson": ["wacker neuson", "wacker", "neuson"],
  Kramer: ["kramer"],
  Mecalac: ["mecalac"],
  Schäffer: ["schäffer", "schaeffer", "schaffer"],
  Avant: ["avant"],
  Gehl: ["gehl"],
  Mustang: ["mustang"],
  Sunward: ["sunward"],
  Zoomlion: ["zoomlion"],
  Terex: ["terex"],
  Hidromek: ["hidromek"],
  Airman: ["airman"],
  IHI: ["ihi"],
  Eurocomach: ["eurocomach"],
  Kato: ["kato"],
  Sennebogen: ["sennebogen"],
  Atlas: ["atlas"],
  Huddig: ["huddig"],
  Venieri: ["venieri"],
  Manitou: ["manitou"],
  Giant: ["giant"],
  Weidemann: ["weidemann"],
  Ditch_Witch: ["ditch witch"],
};

/** Keywords → carrier type, most specific first. */
const TYPE_PATTERNS: Array<[RegExp, CarrierType]> = [
  [/\blong[\s-]?(reach|boom|front)\b/i, "long_reach_excavator"],
  [/\bbackhoe(\s+loader)?s?\b|\bdigger[\s-]loader\b/i, "backhoe_loader"],
  [/\bskid[\s-]?steers?\b|\bcompact\s+track\s+loaders?\b|\btrack\s+loaders?\b|\bctl\b/i, "skid_steer"],
  [/\b(compact\s+|mini\s+)?wheel\s+loaders?\b|\bcompact\s+loaders?\b|\bwheel\s+loaders?\b/i, "compact_loader"],
  [/\b(mini|midi|micro|crawler|wheeled|tracked)?[\s-]?excavators?\b|\bdiggers?\b|\bexcavator\b/i, "excavator"],
];

/** Words that end a model designation. */
const STOP = new Set([
  "excavator", "excavators", "digger", "mini", "midi", "micro", "backhoe", "loader", "loaders", "skid", "steer", "track", "wheel", "wheeled",
  "tracked", "crawler", "with", "and", "from", "year", "model", "machine", "has", "have", "i", "my", "a", "an", "the", "it", "is", "of", "in",
  "long", "reach", "compact",
]);

/** Short suffixes that belong to a model name (e.g. "320 GC", "308 CR", "PC210 LC"). */
const SUFFIXES = /^(gc|cr|cr2|lc|nlc|lcr|sr|nx|e2|e3|ld|lr|ln|xe|xd|ve|plus|pro|max|hd|ht|zts|zts2|ii|iii|iv|v)$/i;

export interface ParsedSpec {
  field: FieldKey;
  value: number;
  unit: string;
  raw: string;
  canonical: number;
}

export interface ParsedMachineText {
  carrierType: CarrierType | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  specs: ParsedSpec[];
}

function findManufacturer(text: string): { name: string; end: number } | null {
  const lower = text.toLowerCase();
  let best: { name: string; start: number; end: number } | null = null;
  for (const [name, aliases] of Object.entries(MANUFACTURERS)) {
    for (const alias of aliases) {
      const re = new RegExp(`(^|[^a-z0-9])(${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^a-z0-9])`, "i");
      const m = re.exec(lower);
      if (!m) continue;
      const start = m.index + m[1].length;
      // "case" is also an English word: require it to be followed by a model-like token.
      if (alias === "case" && !/^case\s+[a-z]*\d/i.test(text.slice(start))) continue;
      if (!best || start < best.start || (start === best.start && alias.length > best.end - best.start)) best = { name: name.replace(/_/g, " "), start, end: start + alias.length };
    }
  }
  return best ? { name: best.name, end: best.end } : null;
}

function findModel(text: string, afterIndex: number): string | null {
  const tokens = text.slice(afterIndex).split(/[\s,;()]+/).filter(Boolean);
  const out: string[] = [];
  for (const raw of tokens) {
    const tok = raw.replace(/[.!?:]+$/, "");
    if (!tok) break;
    if (out.length === 0) {
      if (STOP.has(tok.toLowerCase())) continue; // e.g. "CAT mini 301.5"
      if (!/\d/.test(tok) || /^(19|20)\d\d$/.test(tok)) {
        if (/^[A-Z][A-Za-z-]{1,}$/.test(tok) && !STOP.has(tok.toLowerCase()) && out.length === 0 && /\d/.test(tokens[tokens.indexOf(raw) + 1] ?? "")) {
          out.push(tok); // series name followed by number, e.g. "Bobcat E26" already has digit; "Deere 50G" too
          continue;
        }
        return null;
      }
      out.push(tok);
      continue;
    }
    if (SUFFIXES.test(tok) || (/^[A-Z0-9-]{1,4}$/.test(tok) && /\d/.test(tok) && !/^(19|20)\d\d$/.test(tok) && !/^\d+$/.test(tok))) {
      out.push(tok);
      continue;
    }
    if (out.length === 1 && /^[A-Za-z]+$/.test(out[0]) && /\d/.test(tok)) {
      out.push(tok);
      continue;
    }
    break;
  }
  const model = out.join(" ").trim();
  return model && /\d/.test(model) ? model.slice(0, 80) : null;
}

const NUM = String.raw`(\d{1,3}(?:[ ,. ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)`;
const UNIT_RULES: Array<{ re: RegExp; field: FieldKey; unit: string }> = [
  { re: new RegExp(`${NUM}\\s*(?:us\\s*tons?|short\\s*tons?)\\b`, "gi"), field: "operating_weight_t", unit: "short_ton" },
  { re: new RegExp(`${NUM}\\s*(?:t|tonnes?|metric\\s*tons?)\\b`, "gi"), field: "operating_weight_t", unit: "t" },
  { re: new RegExp(`${NUM}\\s*(?:kg|kilos?|kilograms?)\\b`, "gi"), field: "operating_weight_t", unit: "kg" },
  { re: new RegExp(`${NUM}\\s*(?:lbs?|pounds?)\\b`, "gi"), field: "operating_weight_t", unit: "lb" },
  { re: new RegExp(`${NUM}\\s*kw\\b`, "gi"), field: "engine_power_kw", unit: "kW" },
  { re: new RegExp(`${NUM}\\s*(?:hp|horsepower|bhp)\\b`, "gi"), field: "engine_power_kw", unit: "hp" },
  { re: new RegExp(`${NUM}\\s*(?:l\\s*/\\s*min|lpm|l/m|litres?\\s*(?:per|/)\\s*min(?:ute)?|liters?\\s*(?:per|/)\\s*min(?:ute)?)`, "gi"), field: "aux_flow_lpm", unit: "L/min" },
  { re: new RegExp(`${NUM}\\s*(?:gpm|gal(?:lons?)?\\s*(?:per|/)\\s*min(?:ute)?)\\b`, "gi"), field: "aux_flow_lpm", unit: "gpm" },
  { re: new RegExp(`${NUM}\\s*bar\\b`, "gi"), field: "aux_pressure_bar", unit: "bar" },
  { re: new RegExp(`${NUM}\\s*psi\\b`, "gi"), field: "aux_pressure_bar", unit: "psi" },
  { re: new RegExp(`${NUM}\\s*mpa\\b`, "gi"), field: "aux_pressure_bar", unit: "MPa" },
];

function toNumber(s: string): number {
  const t = s.replace(/ /g, " ");
  // "8 400" / "8,400" / "8.400" thousands groups; a single short decimal part stays decimal.
  if (/^\d{1,3}([ ,.]\d{3})+([.,]\d+)?$/.test(t)) {
    const m = /^(.*?)([.,]\d{1,2})?$/.exec(t)!;
    const intPart = m[1].replace(/[ ,.]/g, "");
    return Number(intPart + (m[2] ? "." + m[2].slice(1) : ""));
  }
  return Number(t.replace(",", "."));
}

export function parseSpecs(text: string): ParsedSpec[] {
  const found = new Map<FieldKey, ParsedSpec>();
  const conflicts = new Set<FieldKey>();
  for (const rule of UNIT_RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) {
      const value = toNumber(m[1]);
      const def = FIELDS[rule.field];
      if (!Number.isFinite(value) || !def.dimension || !findUnit(def.dimension, rule.unit)) continue;
      const canonical = toCanonical(value, def.dimension, rule.unit);
      if (def.sanity && (canonical < def.sanity[0] || canonical > def.sanity[1])) continue;
      const prev = found.get(rule.field);
      if (prev && Math.abs(prev.canonical - canonical) > 1e-9) conflicts.add(rule.field);
      else found.set(rule.field, { field: rule.field, value, unit: rule.unit, raw: m[0].trim(), canonical });
    }
  }
  // Two different values for the same field in one message: don't pick one.
  for (const f of conflicts) found.delete(f);
  return [...found.values()];
}

export function parseMachineText(text: string, now: Date = new Date()): ParsedMachineText {
  const clean = text.replace(/\s+/g, " ").trim();
  const mf = findManufacturer(clean);
  const model = mf ? findModel(clean, mf.end) : null;
  let carrierType: CarrierType | null = null;
  for (const [re, t] of TYPE_PATTERNS) if (re.test(clean)) {
    carrierType = t;
    break;
  }
  let year: number | null = null;
  const maxYear = now.getUTCFullYear() + 1;
  for (const m of clean.matchAll(/\b(19[7-9]\d|20\d\d)\b(?!\s*(?:kg|t|hp|kw|bar|psi|l|lpm|gpm|mm)\b)/gi)) {
    const y = Number(m[1]);
    if (y <= maxYear && !(model && model.includes(m[1]))) {
      year = y;
      break;
    }
  }
  return { carrierType, manufacturer: mf?.name ?? null, model, year, specs: parseSpecs(clean) };
}
