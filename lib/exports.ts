import "server-only";
import { db } from "./db";
import { toCsv } from "./csv";

/**
 * Operator CSV exports, all read from PostgreSQL. "leads" contains personal data;
 * every other export is pseudonymous behavioural data (no names, emails or IPs).
 */
export const EXPORTS = {
  leads: { label: "Enquiries (contains personal data)", pii: true },
  assessments: { label: "Assessment sessions", pii: false },
  "machine-searches": { label: "Machine searches & research cache", pii: false },
  "missing-fields": { label: "Missing / unknown technical fields", pii: false },
  "model-outcomes": { label: "Model outcomes", pii: false },
  questions: { label: "Customer questions (redacted)", pii: false },
  funnel: { label: "Funnel stages per assessment", pii: false },
  events: { label: "Raw analytics events", pii: false },
} as const;
export type ExportKind = keyof typeof EXPORTS;

const PRODUCTS = ["sc400", "sc600", "sc850pro"];
const LIMIT = 50_000;

export async function buildExport(kind: ExportKind): Promise<string> {
  switch (kind) {
    case "leads": {
      const rows = await db().leadEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT, include: { assessment: { select: { carrierType: true, manufacturer: true, model: true, year: true } } } });
      return toCsv(
        ["lead_id", "created_at", "app_env", "enquiry_type", "status", "name", "email", "country", "company", "phone", "message", "assessment_id", "carrier_type", "manufacturer", "model", "year", ...PRODUCTS.flatMap((p) => [`${p}_preliminary`, `${p}_verified`]), "best_candidate", "snapshot_json"],
        rows.map((l) => {
          const snap = l.snapshot as { machine?: { carrierType?: string; manufacturer?: string; model?: string; year?: number }; results?: { productId: string; preliminary: string; verified: string }[]; bestCandidate?: string | null };
          const res = (p: string) => snap.results?.find((r) => r.productId === p);
          return [
            l.id, l.createdAt, l.appEnv, l.enquiryType, l.status, l.name, l.email, l.country, l.company, l.phone, l.message, l.assessmentId,
            snap.machine?.carrierType ?? l.assessment?.carrierType, snap.machine?.manufacturer ?? l.assessment?.manufacturer, snap.machine?.model ?? l.assessment?.model, snap.machine?.year ?? l.assessment?.year,
            ...PRODUCTS.flatMap((p) => [res(p)?.preliminary, res(p)?.verified]),
            snap.bestCandidate, l.snapshot,
          ];
        }),
      );
    }
    case "assessments": {
      const rows = await db().assessment.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: { specifications: { select: { field: true, state: true } }, results: { select: { productId: true, preliminaryStatus: true, strictStatus: true } }, _count: { select: { leads: true } } },
      });
      return toCsv(
        ["assessment_id", "created_at", "updated_at", "stage", "carrier_type", "manufacturer", "model", "year", "identity_confirmed", "unit_system", "fields_answered", "fields_unknown", "fields_from_online_sources", "research_attached", "questions_asked", ...PRODUCTS.flatMap((p) => [`${p}_preliminary`, `${p}_verified`]), "lead_submitted"],
        rows.map((a) => [
          a.id, a.createdAt, a.updatedAt, a.stage, a.carrierType, a.manufacturer, a.model, a.year, a.identityConfirmed, a.unitSystem,
          a.specifications.filter((s) => s.state !== "marked_unknown").length,
          a.specifications.filter((s) => s.state === "marked_unknown").length,
          a.specifications.filter((s) => s.state === "user_confirmed").length,
          !!a.researchId, a.questionsAsked,
          ...PRODUCTS.flatMap((p) => {
            const r = a.results.find((x) => x.productId === p);
            return [r?.preliminaryStatus, r?.strictStatus];
          }),
          a._count.leads > 0,
        ]),
      );
    }
    case "machine-searches": {
      const rows = await db().machineResearch.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT, include: { _count: { select: { assessments: true, candidates: true, sources: true } } } });
      return toCsv(
        ["research_id", "carrier_type", "manufacturer", "model", "status", "error", "searches_used", "candidates", "sources", "assessments_using", "created_at", "completed_at"],
        rows.map((r) => [r.id, r.carrierType, r.manufacturer, r.model, r.status, r.error, r.searchesUsed, r._count.candidates, r._count.sources, r._count.assessments, r.createdAt, r.completedAt]),
      );
    }
    case "missing-fields": {
      const results = await db().assessmentResult.findMany({ select: { productId: true, missing: true, assessment: { select: { carrierType: true } } }, take: LIMIT * 3 });
      const unknown = await db().machineSpecification.groupBy({ by: ["field"], where: { state: "marked_unknown" }, _count: { _all: true } });
      const counts = new Map<string, number>();
      for (const r of results) for (const f of (r.missing as string[]) ?? []) counts.set(`${r.assessment.carrierType ?? "unknown"}|${r.productId}|${f}`, (counts.get(`${r.assessment.carrierType ?? "unknown"}|${r.productId}|${f}`) ?? 0) + 1);
      const rows: unknown[][] = [...counts.entries()].map(([k, n]) => [...k.split("|"), n, "missing_for_result"]);
      for (const u of unknown) rows.push(["", "", u.field, u._count._all, "marked_unknown_by_user"]);
      return toCsv(["carrier_type", "product_id", "field", "count", "kind"], rows.sort((a, b) => Number(b[3]) - Number(a[3])));
    }
    case "model-outcomes": {
      const g = await db().assessmentResult.groupBy({ by: ["productId", "preliminaryStatus", "strictStatus"], _count: { _all: true } });
      return toCsv(["product_id", "preliminary_status", "verified_status", "assessments"], g.map((x) => [x.productId, x.preliminaryStatus, x.strictStatus, x._count._all]));
    }
    case "questions": {
      const rows = await db().conversationMessage.findMany({
        where: { role: "user" },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: { assessment: { select: { carrierType: true, manufacturer: true, model: true } } },
      });
      return toCsv(["message_id", "created_at", "kind", "assessment_id", "carrier_type", "manufacturer", "model", "text_redacted"], rows.map((m) => [m.id, m.createdAt, m.kind, m.assessmentId, m.assessment.carrierType, m.assessment.manufacturer, m.assessment.model, m.content]));
    }
    case "funnel": {
      const events = await db().analyticsEvent.findMany({
        where: { assessmentRef: { not: null }, name: { in: ["assessment_started", "machine_identity_confirmed", "assessment_completed", "compatibility_result_viewed", "lead_form_opened", "lead_submitted"] } },
        select: { assessmentRef: true, name: true, createdAt: true, carrierType: true, utmSource: true, utmMedium: true, utmCampaign: true },
        orderBy: { createdAt: "asc" },
        take: LIMIT * 4,
      });
      const by = new Map<string, { first: Date; carrier: string | null; utm: (string | null)[]; s: Set<string> }>();
      for (const e of events) {
        const k = e.assessmentRef!;
        const x = by.get(k) ?? { first: e.createdAt, carrier: null, utm: [null, null, null], s: new Set<string>() };
        x.s.add(e.name);
        if (e.carrierType) x.carrier = e.carrierType;
        if (e.utmSource || e.utmMedium || e.utmCampaign) x.utm = [e.utmSource, e.utmMedium, e.utmCampaign];
        by.set(k, x);
      }
      const stage = (s: Set<string>) =>
        s.has("lead_submitted") ? "5_lead" : s.has("compatibility_result_viewed") && s.has("assessment_completed") ? "4_result_viewed" : s.has("assessment_completed") ? "3_core_specs" : s.has("machine_identity_confirmed") ? "2_identified" : "1_started";
      return toCsv(
        ["assessment_id", "started_at", "carrier_type", "utm_source", "utm_medium", "utm_campaign", "started", "identified", "core_specs_gathered", "result_viewed", "lead_form_opened", "lead_submitted", "furthest_stage"],
        [...by.entries()].map(([k, x]) => [k, x.first, x.carrier, ...x.utm, x.s.has("assessment_started"), x.s.has("machine_identity_confirmed"), x.s.has("assessment_completed"), x.s.has("compatibility_result_viewed"), x.s.has("lead_form_opened"), x.s.has("lead_submitted"), stage(x.s)]),
      );
    }
    case "events": {
      const rows = await db().analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT });
      return toCsv(
        ["event_id", "created_at", "schema_version", "name", "visitor_ref", "assessment_ref", "stage", "carrier_type", "manufacturer", "model", "field_key", "product_id", "status", "utm_source", "utm_medium", "utm_campaign", "props_json"],
        rows.map((e) => [e.id, e.createdAt, e.schemaVersion, e.name, e.visitorRef, e.assessmentRef, e.stage, e.carrierType, e.manufacturer, e.model, e.fieldKey, e.productId, e.status, e.utmSource, e.utmMedium, e.utmCampaign, e.props]),
      );
    }
  }
}
