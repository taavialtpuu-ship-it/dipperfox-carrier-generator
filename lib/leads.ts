/**
 * CRM-ready enquiry snapshot (no Odoo sync in MVP). Pure function of the assessment DTO.
 */
import { FIELDS } from "./domain";
import type { AssessmentDTO } from "./dto";
import { t } from "./i18n/en";
import { formatCanonical } from "./units";

export const LEAD_SNAPSHOT_VERSION = 1;
export const PRIVACY_NOTICE_VERSION = "draft-2026-11-12";

export function buildLeadSnapshot(a: AssessmentDTO, appEnv: string) {
  const ev = a.evaluation;
  return {
    snapshotVersion: LEAD_SNAPSHOT_VERSION,
    appEnv,
    assessmentId: a.id,
    evaluatedAt: ev.evaluatedAt,
    engineVersion: ev.engineVersion,
    ruleSetVersions: [...new Set(ev.products.flatMap((p) => p.ruleSetVersions))],
    warning:
      "Preliminary comparison against Dipperfox published reference figures (source document v0.1, manufacturer approval pending). Customer-supplied values are not verified by Dipperfox. This is not an installation approval.",
    machine: {
      carrierType: a.carrierType,
      manufacturer: a.manufacturer,
      model: a.model,
      year: a.year,
      identityConfirmed: a.identityConfirmed,
      initialDescription: a.initialInput,
      specs: a.specs.map((s) => {
        const def = FIELDS[s.field];
        return {
          field: s.field,
          label: t.fields[s.field].label,
          state: s.state,
          canonical: s.valueCanonical != null && def.dimension ? formatCanonical(s.valueCanonical, def.dimension, "metric") : null,
          canonicalValue: s.valueCanonical,
          text: s.valueText,
          entered: s.enteredValue ? `${s.enteredValue}${s.enteredUnit ? ` ${s.enteredUnit}` : ""}` : null,
          origin: s.origin,
          source: s.source?.url ?? null,
        };
      }),
    },
    results: ev.products.map((p) => ({
      productId: p.productId,
      preliminary: p.preliminary.status,
      preliminaryLabel: t.outcomes.preliminary[p.preliminary.status],
      verified: p.strict.status,
      verifiedLabel: t.outcomes.strict[p.strict.status],
      openChecks: p.strict.checks.filter((c) => c.outcome !== "pass" && c.outcome !== "not_applicable").map((c) => `${t.checks[c.key]}: ${t.codes[c.code] ?? c.code}`),
      missingQuestions: p.missingFields.map((f) => t.fields[f].question),
      suitability: p.suitability,
    })),
    bestCandidate: ev.bestCandidate,
    researchSources: (a.research?.sources ?? []).map((s) => ({ url: s.url, title: s.title, origin: s.origin, retrievedAt: s.retrievedAt })),
    customerQuestions: a.messages.filter((m) => m.kind === "question").map((m) => m.content),
  };
}

export type LeadSnapshot = ReturnType<typeof buildLeadSnapshot>;
