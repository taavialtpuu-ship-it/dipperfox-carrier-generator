import "server-only";
import { evaluate } from "./compatibility/engine";
import { ENGINE_VERSION, type Requirement } from "./compatibility/types";
import { db } from "./db";
import type { AssessmentDTO, CandidateDTO, RequirementDTO, SourceDTO, SpecDTO } from "./dto";
import { CARRIER_TYPES, type CarrierType, type FieldKey, type MachineProfile, type SpecValue } from "./domain";
import { env } from "./env";
import { isCoreComplete, nextStep } from "./guide";
import { notFound } from "./http";
import { track } from "./analytics";
import type { Prisma } from "./generated/prisma/client";

export const assessmentInclude = {
  specifications: { include: { evidenceSource: true }, orderBy: { createdAt: "asc" } },
  messages: { orderBy: { createdAt: "asc" }, take: 200 },
  research: {
    include: {
      candidates: { include: { evidenceSource: true }, orderBy: { createdAt: "asc" } },
      sources: { orderBy: { createdAt: "asc" } },
    },
  },
} satisfies Prisma.AssessmentInclude;

export type AssessmentFull = Prisma.AssessmentGetPayload<{ include: typeof assessmentInclude }>;

/** Load an assessment only if the current visitor owns it; otherwise 404 (no existence leak). */
export async function loadOwned(visitorId: string, id: string): Promise<AssessmentFull> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const a = await db().assessment.findFirst({ where: { id, visitorId }, include: assessmentInclude });
  if (!a) throw notFound();
  return a;
}

let reqCache: { at: number; reqs: Requirement[] } | null = null;

export async function loadRequirements(): Promise<Requirement[]> {
  if (reqCache && Date.now() - reqCache.at < 60_000) return reqCache.reqs;
  const rows = await db().productRequirement.findMany({ where: { status: { not: "superseded" } } });
  const reqs = rows.map(
    (r): Requirement => ({
      id: r.id,
      productId: r.productId,
      productRevision: r.productRevision,
      carrierType: r.carrierType,
      parameter: r.parameter as Requirement["parameter"],
      min: r.min,
      max: r.max,
      value: r.value,
      allowedValues: r.allowedValues,
      ruleKind: r.ruleKind as Requirement["ruleKind"],
      unit: r.unit,
      status: r.status as Requirement["status"],
      conflictGroup: r.conflictGroup,
      sourceRef: r.sourceRef,
      sourceUrl: r.sourceUrl,
      sourceTitle: r.sourceTitle,
      remedyKind: r.remedyKind as Requirement["remedyKind"],
      remedyDescription: r.remedyDescription,
      remedySourceUrl: r.remedySourceUrl,
      note: r.note,
      ruleSetVersion: r.ruleSetVersion,
    }),
  );
  reqCache = { at: Date.now(), reqs };
  return reqs;
}

export function requirementToDTO(r: Awaited<ReturnType<ReturnType<typeof db>["productRequirement"]["findMany"]>>[number]): RequirementDTO {
  return {
    id: r.id,
    productId: r.productId,
    carrierType: r.carrierType,
    parameter: r.parameter,
    min: r.min,
    max: r.max,
    value: r.value,
    ruleKind: r.ruleKind,
    unit: r.unit,
    status: r.status,
    conflictGroup: r.conflictGroup,
    sourceRef: r.sourceRef,
    sourceUrl: r.sourceUrl,
    sourceTitle: r.sourceTitle,
    checkedAt: r.checkedAt?.toISOString() ?? null,
    note: r.note,
    ruleSetVersion: r.ruleSetVersion,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt?.toISOString() ?? null,
  };
}

export function toProfile(a: AssessmentFull): MachineProfile {
  const specs: MachineProfile["specs"] = {};
  for (const s of a.specifications) {
    specs[s.field as FieldKey] = {
      field: s.field as FieldKey,
      state: s.state as SpecValue["state"],
      valueCanonical: s.valueCanonical,
      valueText: s.valueText,
      enteredValue: s.enteredValue,
      enteredUnit: s.enteredUnit,
      origin: s.origin as SpecValue["origin"],
      sourceUrl: s.evidenceSource?.url ?? null,
      sourceTitle: s.evidenceSource?.title ?? null,
    };
  }
  const carrierType = (CARRIER_TYPES as readonly string[]).includes(a.carrierType ?? "") ? (a.carrierType as CarrierType) : null;
  return {
    carrierType,
    manufacturer: a.manufacturer,
    model: a.model,
    year: a.year,
    identityConfirmed: a.identityConfirmed,
    specs,
  };
}

function sourceDTO(s: { id: string; origin: string; url: string | null; title: string | null; publisher: string | null; locator: string | null; excerpt: string | null; retrievedAt: Date } | null): SourceDTO | null {
  if (!s) return null;
  return { id: s.id, origin: s.origin, url: s.url, title: s.title, publisher: s.publisher, locator: s.locator, excerpt: s.excerpt, retrievedAt: s.retrievedAt.toISOString() };
}

export async function toDTO(a: AssessmentFull): Promise<AssessmentDTO> {
  const profile = toProfile(a);
  const evaluation = evaluate(profile, await loadRequirements());
  const r = a.research;
  const refreshMs = env.researchRefreshDays * 86400_000;
  const specs: SpecDTO[] = a.specifications.map((s) => ({
    field: s.field as FieldKey,
    state: s.state as SpecDTO["state"],
    valueCanonical: s.valueCanonical,
    valueText: s.valueText,
    enteredValue: s.enteredValue,
    enteredUnit: s.enteredUnit,
    origin: s.origin as SpecDTO["origin"],
    source: sourceDTO(s.evidenceSource),
    updatedAt: s.updatedAt.toISOString(),
  }));
  return {
    id: a.id,
    title: a.title,
    stage: a.stage,
    carrierType: a.carrierType,
    manufacturer: a.manufacturer,
    model: a.model,
    updatedAt: a.updatedAt.toISOString(),
    initialInput: a.initialInput,
    year: a.year,
    identityConfirmed: a.identityConfirmed,
    unitSystem: a.unitSystem === "us" ? "us" : "metric",
    createdAt: a.createdAt.toISOString(),
    questionsAsked: a.questionsAsked,
    specs,
    evaluation,
    research: r
      ? {
          id: r.id,
          status: r.status as "pending" | "running" | "completed" | "failed",
          error: r.error,
          summary: r.summary,
          completedAt: r.completedAt?.toISOString() ?? null,
          refreshing: !!r.refreshStartedAt && (!r.completedAt || r.refreshStartedAt > r.completedAt) && r.status === "completed",
          fromCache: !!r.completedAt && r.completedAt < a.createdAt,
          candidates: r.candidates.map(
            (c): CandidateDTO => ({
              id: c.id,
              field: c.field as FieldKey,
              valueCanonical: c.valueCanonical,
              valueText: c.valueText,
              originalValue: c.originalValue,
              originalUnit: c.originalUnit,
              meaning: c.meaning,
              appliesTo: c.appliesTo,
              confidence: c.confidence,
              source: sourceDTO(c.evidenceSource),
            }),
          ),
          sources: r.sources.map((s) => sourceDTO(s)!),
        }
      : null,
    messages: a.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant" | "system", kind: m.kind, content: m.content, createdAt: m.createdAt.toISOString() })),
    next: nextStep(profile),
    capabilities: {
      ai: !!env.anthropicApiKey,
      research: !!env.anthropicApiKey && (!r || r.status !== "running") && refreshMs > 0,
      questionsRemaining: Math.max(0, env.maxQuestionsPerAssessment - a.questionsAsked),
    },
  };
}

/**
 * Re-run the deterministic engine and persist the latest result per product.
 * Emits assessment_recalculated, and assessment_completed the first time the core
 * fields are all answered.
 */
export async function evaluateAndPersist(a: AssessmentFull, visitorRef: string): Promise<void> {
  const profile = toProfile(a);
  const result = evaluate(profile, await loadRequirements());
  const ruleSetVersion = [...new Set(result.products.flatMap((p) => p.ruleSetVersions))].join("+") || "none";
  await db().$transaction([
    ...result.products.map((p) =>
      db().assessmentResult.upsert({
        where: { assessmentId_productId: { assessmentId: a.id, productId: p.productId } },
        create: {
          assessmentId: a.id,
          productId: p.productId,
          strictStatus: p.strict.status,
          preliminaryStatus: p.preliminary.status,
          ruleSetVersion,
          engineVersion: ENGINE_VERSION,
          checks: { strict: p.strict.checks, preliminary: p.preliminary.checks } as unknown as Prisma.InputJsonValue,
          reasons: p.strict.checks.filter((c) => c.outcome !== "pass").map((c) => c.code),
          missing: p.missingFields,
          inputsSnapshot: profile as unknown as Prisma.InputJsonValue,
        },
        update: {
          strictStatus: p.strict.status,
          preliminaryStatus: p.preliminary.status,
          ruleSetVersion,
          engineVersion: ENGINE_VERSION,
          checks: { strict: p.strict.checks, preliminary: p.preliminary.checks } as unknown as Prisma.InputJsonValue,
          reasons: p.strict.checks.filter((c) => c.outcome !== "pass").map((c) => c.code),
          missing: p.missingFields,
          inputsSnapshot: profile as unknown as Prisma.InputJsonValue,
          evaluatedAt: new Date(),
        },
      }),
    ),
    db().assessment.update({
      where: { id: a.id },
      data: {
        ruleSetVersion,
        ...(isCoreComplete(profile) && a.stage !== "result" && a.stage !== "enquiry" ? { stage: "result" } : {}),
      },
    }),
  ]);
  const common = { visitorRef, assessmentRef: a.id, carrierType: a.carrierType, manufacturer: a.manufacturer, model: a.model };
  await track("assessment_recalculated", {
    ...common,
    stage: a.stage,
    props: Object.fromEntries(result.products.map((p) => [p.productId, { strict: p.strict.status, preliminary: p.preliminary.status }])),
  });
  if (isCoreComplete(profile) && a.stage !== "result" && a.stage !== "enquiry") {
    await track("assessment_completed", {
      ...common,
      stage: "result",
      props: {
        bestCandidate: result.bestCandidate,
        outcomes: Object.fromEntries(result.products.map((p) => [p.productId, p.preliminary.status])),
        missing: [...new Set(result.products.flatMap((p) => p.missingFields))],
      },
    });
  }
}
