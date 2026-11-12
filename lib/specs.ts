import "server-only";
import type { z } from "zod";
import { track } from "./analytics";
import type { AssessmentFull } from "./assessments";
import { db } from "./db";
import { FIELDS } from "./domain";
import { HttpError } from "./http";
import { findUnit, toCanonical } from "./units";
import type { specActionSchema } from "./validation";

type SpecAction = z.infer<typeof specActionSchema>;

/** Apply one user action to a machine specification. All values are user-supplied or user-confirmed. */
export async function applySpecAction(a: AssessmentFull, action: SpecAction, visitorRef: string): Promise<void> {
  const common = { visitorRef, assessmentRef: a.id, carrierType: a.carrierType, manufacturer: a.manufacturer, model: a.model, stage: a.stage };

  if (action.action === "confirm_candidate") {
    const c = a.research?.candidates.find((x) => x.id === action.candidateId);
    if (!c) throw new HttpError(404, "not_found", "That suggestion is no longer available.");
    const def = FIELDS[c.field as keyof typeof FIELDS];
    if (!def) throw new HttpError(400, "invalid_field", "Unknown field.");
    const data = {
      state: "user_confirmed",
      valueCanonical: c.valueCanonical,
      valueText: c.valueText,
      enteredValue: c.originalValue,
      enteredUnit: c.originalUnit,
      origin: c.evidenceSource?.origin ?? "other_web",
      evidenceSourceId: c.evidenceSourceId,
      configurationNote: c.appliesTo,
    };
    await db().machineSpecification.upsert({
      where: { assessmentId_field: { assessmentId: a.id, field: c.field } },
      create: { assessmentId: a.id, field: c.field, ...data },
      update: data,
    });
    await track("spec_confirmed", { ...common, fieldKey: c.field, props: { origin: data.origin, sourceHost: hostOf(c.evidenceSource?.url) } });
    return;
  }

  const def = FIELDS[action.field];
  const existing = a.specifications.find((s) => s.field === action.field);

  if (action.action === "clear") {
    if (existing) await db().machineSpecification.delete({ where: { id: existing.id } });
    return;
  }

  if (action.action === "unknown") {
    const data = { state: "marked_unknown", valueCanonical: null, valueText: null, enteredValue: null, enteredUnit: null, origin: "user_entry", evidenceSourceId: null };
    await db().machineSpecification.upsert({
      where: { assessmentId_field: { assessmentId: a.id, field: action.field } },
      create: { assessmentId: a.id, field: action.field, ...data },
      update: data,
    });
    await track("spec_marked_unknown", { ...common, fieldKey: action.field });
    return;
  }

  let data;
  if (action.action === "set_number") {
    if (def.kind !== "number" || !def.dimension) throw new HttpError(400, "invalid_field", "This field does not take a number.");
    if (!findUnit(def.dimension, action.unit)) throw new HttpError(400, "invalid_unit", "That unit is not supported for this field.");
    if (action.value < 0) throw new HttpError(400, "invalid_value", "The value cannot be negative.");
    const canonical = toCanonical(action.value, def.dimension, action.unit);
    if (def.sanity && (canonical < def.sanity[0] || canonical > def.sanity[1]))
      throw new HttpError(400, "implausible_value", "That value looks implausible for this field — please check the number and unit.");
    data = {
      state: "user_entered",
      valueCanonical: canonical,
      valueText: null,
      enteredValue: String(action.value),
      enteredUnit: action.unit,
      origin: "user_entry",
      evidenceSourceId: null,
    };
  } else {
    if (def.kind !== "choice" || !def.options?.includes(action.value)) throw new HttpError(400, "invalid_value", "That option is not valid for this field.");
    data = { state: "user_entered", valueCanonical: null, valueText: action.value, enteredValue: action.value, enteredUnit: null, origin: "user_entry", evidenceSourceId: null };
  }

  await db().machineSpecification.upsert({
    where: { assessmentId_field: { assessmentId: a.id, field: action.field } },
    create: { assessmentId: a.id, field: action.field, ...data },
    update: data,
  });
  const corrected = existing && existing.state !== "marked_unknown" && (existing.valueCanonical !== data.valueCanonical || existing.valueText !== data.valueText);
  const candidate = a.research?.candidates.find((c) => c.field === action.field);
  await track(corrected || (candidate && existing?.state !== "user_entered") ? "spec_corrected" : "spec_entered", {
    ...common,
    fieldKey: action.field,
    props: {
      unit: data.enteredUnit,
      value: data.valueCanonical ?? data.valueText,
      hadOnlineSuggestion: !!candidate,
    },
  });
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
