/**
 * Unit conversion. Canonical (stored and compared) units are metric:
 *   mass_t: t (1,000 kg) · mass_kg: kg · power: kW · flow: L/min · pressure: bar · length: mm
 * Values are never rounded before comparison; rounding is for display only.
 */

export type UnitSystem = "metric" | "us";
export type Dimension = "mass_t" | "mass_kg" | "power" | "flow" | "pressure" | "length";

export const KG_PER_SHORT_TON = 907.18474;
export const KW_PER_HP = 0.745699872;
export const L_PER_US_GAL = 3.785411784;
export const BAR_PER_PSI = 0.0689475729;
export const KG_PER_LB = 0.45359237;
export const MM_PER_IN = 25.4;

interface UnitDef {
  id: string;
  label: string;
  /** canonical = value * factor */
  factor: number;
  system: UnitSystem;
}

export const UNITS: Record<Dimension, UnitDef[]> = {
  mass_t: [
    { id: "t", label: "t", factor: 1, system: "metric" },
    { id: "kg", label: "kg", factor: 0.001, system: "metric" },
    { id: "short_ton", label: "US tons", factor: KG_PER_SHORT_TON / 1000, system: "us" },
    { id: "lb", label: "lb", factor: KG_PER_LB / 1000, system: "us" },
  ],
  mass_kg: [
    { id: "kg", label: "kg", factor: 1, system: "metric" },
    { id: "t", label: "t", factor: 1000, system: "metric" },
    { id: "lb", label: "lb", factor: KG_PER_LB, system: "us" },
  ],
  power: [
    { id: "kW", label: "kW", factor: 1, system: "metric" },
    { id: "hp", label: "hp", factor: KW_PER_HP, system: "us" },
  ],
  flow: [
    { id: "L/min", label: "L/min", factor: 1, system: "metric" },
    { id: "gpm", label: "US gpm", factor: L_PER_US_GAL, system: "us" },
  ],
  pressure: [
    { id: "bar", label: "bar", factor: 1, system: "metric" },
    { id: "psi", label: "psi", factor: BAR_PER_PSI, system: "us" },
    { id: "MPa", label: "MPa", factor: 10, system: "metric" },
  ],
  length: [
    { id: "mm", label: "mm", factor: 1, system: "metric" },
    { id: "in", label: "in", factor: MM_PER_IN, system: "us" },
  ],
};

export function canonicalUnit(dim: Dimension): string {
  return UNITS[dim][0].id;
}

export function displayUnit(dim: Dimension, system: UnitSystem): UnitDef {
  return UNITS[dim].find((u) => u.system === system) ?? UNITS[dim][0];
}

export function findUnit(dim: Dimension, unitId: string): UnitDef | undefined {
  return UNITS[dim].find((u) => u.id === unitId);
}

export function toCanonical(value: number, dim: Dimension, unitId: string): number {
  const u = findUnit(dim, unitId);
  if (!u) throw new Error(`Unknown unit "${unitId}" for ${dim}`);
  return value * u.factor;
}

export function fromCanonical(value: number, dim: Dimension, unitId: string): number {
  const u = findUnit(dim, unitId);
  if (!u) throw new Error(`Unknown unit "${unitId}" for ${dim}`);
  return value / u.factor;
}

const DISPLAY_DECIMALS: Record<string, number> = {
  t: 2,
  kg: 0,
  short_ton: 2,
  lb: 0,
  kW: 1,
  hp: 0,
  "L/min": 0,
  gpm: 1,
  bar: 0,
  psi: 0,
  MPa: 1,
  mm: 0,
  in: 1,
};

/** Round for display only. Trailing zeros removed. */
export function formatNumber(value: number, unitId: string): string {
  const d = DISPLAY_DECIMALS[unitId] ?? 2;
  const rounded = Number(value.toFixed(d));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: d });
}

/** Format a canonical value in the chosen unit system, e.g. "8.4 t" or "9.26 US tons". */
export function formatCanonical(value: number, dim: Dimension, system: UnitSystem): string {
  const u = displayUnit(dim, system);
  return `${formatNumber(fromCanonical(value, dim, u.id), u.id)} ${u.label}`;
}

export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  dim: Dimension,
  system: UnitSystem,
): string {
  const u = displayUnit(dim, system);
  const f = (v: number) => formatNumber(fromCanonical(v, dim, u.id), u.id);
  if (min != null && max != null) return `${f(min)}–${f(max)} ${u.label}`;
  if (min != null) return `≥ ${f(min)} ${u.label}`;
  if (max != null) return `≤ ${f(max)} ${u.label}`;
  return "—";
}
