import "server-only";
import { track } from "../analytics";
import type { AssessmentFull } from "../assessments";
import { db } from "../db";
import { t } from "../i18n/en";
import type { ParsedSpec } from "./parse";

/**
 * Save values the visitor stated in their own words as user-entered answers.
 * By default an existing answer is kept (initial description); with `overwrite`
 * a later chat statement corrects it.
 */
export async function saveStatedSpecs(
  a: AssessmentFull,
  specs: ParsedSpec[],
  visitorRef: string,
  opts: { overwrite: boolean; note: string },
): Promise<ParsedSpec[]> {
  const saved: ParsedSpec[] = [];
  for (const s of specs) {
    const existing = a.specifications.find((x) => x.field === s.field);
    if (existing && !opts.overwrite) continue;
    if (existing && existing.valueCanonical === s.canonical && existing.state !== "marked_unknown") continue;
    const data = {
      state: "user_entered",
      valueCanonical: s.canonical,
      valueText: null,
      enteredValue: String(s.value),
      enteredUnit: s.unit,
      origin: "user_entry",
      evidenceSourceId: null,
      configurationNote: opts.note,
    };
    await db().machineSpecification.upsert({
      where: { assessmentId_field: { assessmentId: a.id, field: s.field } },
      create: { assessmentId: a.id, field: s.field, ...data },
      update: data,
    });
    saved.push(s);
    await track(existing ? "spec_corrected" : "spec_entered", {
      visitorRef,
      assessmentRef: a.id,
      carrierType: a.carrierType,
      manufacturer: a.manufacturer,
      model: a.model,
      stage: a.stage,
      fieldKey: s.field,
      props: { unit: s.unit, value: s.canonical, via: opts.note },
    });
  }
  return saved;
}

export function describeSaved(specs: ParsedSpec[]): string {
  return specs.map((s) => `${t.fields[s.field].label.replace(/ \(.*\)$/, "").toLowerCase()} ${s.raw}`).join(", ");
}
