/**
 * Built-in answers for "what is …" questions about technical terms. Pure, free, consistent.
 * Only short definitional questions match; anything else goes to the AI guide (if configured).
 */
import type { FieldKey } from "../domain";
import { t } from "../i18n/en";

const TERMS: Array<[RegExp, FieldKey]> = [
  [/case[\s-]?drain|motor\s+housing\s+drain|drain\s+line/i, "case_drain_line"],
  [/free[\s-]?return|return\s+line|tank\s+line/i, "free_return_line"],
  [/bi[\s-]?directional|two[\s-]?way\s+(aux|circuit|hydraulic)/i, "bidirectional_aux"],
  [/simultaneous|same\s+time/i, "flow_pressure_simultaneous"],
  [/(aux(iliary)?\s+)?flow\s+(at\s+the\s+attachment|under\s+load)|auxiliary\s+flow|hydraulic\s+flow/i, "aux_flow_lpm"],
  [/working\s+pressure|(aux(iliary)?|operating)\s+pressure|pressure\s+under\s+load/i, "aux_pressure_bar"],
  [/operating\s+weight|working\s+configuration/i, "operating_weight_t"],
  [/hydraulic\s+package|high[\s-]?flow|hammer\s+line/i, "hydraulic_package"],
  [/quick[\s-]?coupler|coupler|mounting/i, "coupler_type"],
  [/tilt[\s-]?rotator|adapter\s+plate/i, "adapter_setup"],
  [/lift\s+(chart|capacity)|permitted\s+attachment\s+mass/i, "permissible_tool_mass_kg"],
  [/stability/i, "working_position_stability"],
];

/** Matches short definitional questions ("what is / what does … mean / explain …"). */
export function matchGlossary(text: string): FieldKey | null {
  const q = text.trim();
  if (q.length > 120) return null;
  if (!/^(what('s| is| are| does)|explain|define|meaning of|what do you mean)/i.test(q)) return null;
  for (const [re, field] of TERMS) if (re.test(q)) return field;
  return null;
}

export function glossaryAnswer(field: FieldKey): string {
  return `${t.fields[field].label}: ${t.fields[field].help}`;
}
