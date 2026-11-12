import "server-only";
import { db } from "./db";
import { log } from "./log";

/** Versioned event schema. See docs/DATA_DICTIONARY.md. */
export const ANALYTICS_SCHEMA_VERSION = 1;

export const EVENT_NAMES = [
  "assessment_started",
  "machine_input_submitted",
  "machine_identity_suggested",
  "machine_identity_confirmed",
  "web_research_started",
  "web_research_completed",
  "web_research_failed",
  "web_research_cache_hit",
  "source_opened",
  "spec_candidate_found",
  "spec_confirmed",
  "spec_corrected",
  "spec_entered",
  "spec_marked_unknown",
  "technical_question_asked",
  "assessment_recalculated",
  "assessment_completed",
  "compatibility_result_viewed",
  "lead_form_opened",
  "lead_submitted",
  "assessment_reopened",
  "assessment_renamed",
  "assessment_deleted",
  "unit_system_changed",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Client-reportable events (UI-only facts). Business events are recorded server-side. */
export const CLIENT_EVENTS: EventName[] = ["source_opened", "compatibility_result_viewed", "lead_form_opened", "assessment_reopened"];

export interface EventData {
  visitorRef?: string | null;
  assessmentRef?: string | null;
  stage?: string | null;
  carrierType?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  fieldKey?: string | null;
  productId?: string | null;
  status?: string | null;
  props?: Record<string, unknown>;
  utm?: { source?: string; medium?: string; campaign?: string } | null;
}

/** Fire-and-forget; analytics must never break the user flow. */
export async function track(name: EventName, d: EventData = {}): Promise<void> {
  try {
    await db().analyticsEvent.create({
      data: {
        name,
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        visitorRef: d.visitorRef ?? null,
        assessmentRef: d.assessmentRef ?? null,
        stage: d.stage ?? null,
        carrierType: d.carrierType ?? null,
        manufacturer: d.manufacturer ?? null,
        model: d.model ?? null,
        fieldKey: d.fieldKey ?? null,
        productId: d.productId ?? null,
        status: d.status ?? null,
        props: (d.props as object) ?? undefined,
        utmSource: d.utm?.source?.slice(0, 100) ?? null,
        utmMedium: d.utm?.medium?.slice(0, 100) ?? null,
        utmCampaign: d.utm?.campaign?.slice(0, 100) ?? null,
      },
    });
  } catch (e) {
    log.warn("analytics_write_failed", { name, msg: e instanceof Error ? e.message : String(e) });
  }
}
