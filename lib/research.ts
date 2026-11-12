import "server-only";
import { anthropicResearchProvider } from "./ai/anthropic";
import { AiUnavailableError } from "./ai/types";
import { groundCandidates, normUrl } from "./research-grounding";
import { track } from "./analytics";
import { db } from "./db";
import { env } from "./env";
import { log } from "./log";

const STUCK_MS = 5 * 60_000;

export function researchCacheKey(carrierType: string, manufacturer: string, model: string): string {
  const n = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  return `${carrierType}|${n(manufacturer)}|${n(model)}`;
}

/** Run research for a cache row and store the results. Never throws. */
async function runResearch(researchId: string, machine: { carrierType: string; manufacturer: string; model: string; year: number | null }, ctx: { assessmentRef: string; visitorRef: string; isRefresh: boolean }) {
  const common = { visitorRef: ctx.visitorRef, assessmentRef: ctx.assessmentRef, carrierType: machine.carrierType, manufacturer: machine.manufacturer, model: machine.model };
  await track("web_research_started", { ...common, props: { refresh: ctx.isRefresh } });
  try {
    const { output, retrieved, searches } = await anthropicResearchProvider.research(machine, { assessmentRef: ctx.assessmentRef });
    const { accepted, rejected } = groundCandidates(output, retrieved);
    if (rejected.length) log.warn("research_candidates_rejected", { researchId, rejected });
    await db().$transaction(async (tx) => {
      // Replace previous results only after a successful run.
      await tx.specCandidate.deleteMany({ where: { researchId } });
      await tx.evidenceSource.deleteMany({ where: { researchId } });
      const sourceIds = new Map<string, string>();
      for (const r of retrieved.filter((x) => accepted.some((a) => normUrl(a.source.url) === normUrl(x.url)))) {
        const a = accepted.find((x) => normUrl(x.source.url) === normUrl(r.url))!;
        const s = await tx.evidenceSource.create({
          data: { researchId, origin: a.source.origin, url: r.url, title: a.source.title, publisher: hostOf(r.url), locator: a.source.locator, excerpt: a.source.excerpt },
        });
        sourceIds.set(normUrl(r.url), s.id);
      }
      for (const a of accepted) {
        await tx.specCandidate.create({
          data: {
            researchId,
            field: a.field,
            valueCanonical: a.valueCanonical,
            valueText: a.valueText,
            originalValue: a.originalValue,
            originalUnit: a.originalUnit,
            meaning: a.meaning,
            appliesTo: a.appliesTo,
            confidence: a.confidence,
            evidenceSourceId: sourceIds.get(normUrl(a.source.url)) ?? null,
          },
        });
      }
      await tx.machineResearch.update({
        where: { id: researchId },
        data: { status: "completed", error: null, summary: output.summary.slice(0, 1000), completedAt: new Date(), searchesUsed: searches },
      });
    });
    await track("web_research_completed", { ...common, props: { candidates: accepted.length, rejected: rejected.length, searches, fields: [...new Set(accepted.map((a) => a.field))] } });
    for (const a of accepted) await track("spec_candidate_found", { ...common, fieldKey: a.field, props: { origin: a.source.origin, host: hostOf(a.source.url) } });
  } catch (e) {
    const reason = e instanceof AiUnavailableError ? e.reason : "provider_error";
    const message = e instanceof Error ? e.message : String(e);
    log.error("research_failed", { researchId, reason, msg: message });
    const row = await db().machineResearch.findUnique({ where: { id: researchId }, select: { completedAt: true } });
    // A failed refresh keeps the earlier good data.
    await db().machineResearch.update({
      where: { id: researchId },
      data: row?.completedAt ? { status: "completed", refreshStartedAt: null } : { status: "failed", error: message.slice(0, 300) },
    });
    await track("web_research_failed", { ...common, status: reason });
  }
}

export type StartResearchResult = "started" | "cache_hit" | "refreshing" | "running" | "not_configured" | "budget_exhausted" | "limit_reached";

/**
 * Attach research to an assessment. Searches the web only when the machine is not yet
 * in the cache, the cached entry is older than RESEARCH_REFRESH_DAYS, a previous attempt
 * failed, or an operator forced a refresh.
 */
export async function startResearch(
  assessment: { id: string; carrierType: string; manufacturer: string; model: string; year: number | null; researchRuns: number },
  visitorRef: string,
  opts: { force?: boolean } = {},
): Promise<StartResearchResult> {
  const key = researchCacheKey(assessment.carrierType, assessment.manufacturer, assessment.model);
  let row = await db().machineResearch.findUnique({ where: { cacheKey: key } });
  const machine = { carrierType: assessment.carrierType, manufacturer: assessment.manufacturer, model: assessment.model, year: assessment.year };
  const ctx = { assessmentRef: assessment.id, visitorRef };

  if (!row) {
    row = await db().machineResearch.create({ data: { cacheKey: key, carrierType: machine.carrierType, manufacturer: machine.manufacturer, model: machine.model } });
  }
  await db().assessment.update({ where: { id: assessment.id }, data: { researchId: row.id } });

  const now = Date.now();
  const running = row.status === "running" && row.startedAt && now - row.startedAt.getTime() < STUCK_MS;
  const refreshing = row.refreshStartedAt && now - row.refreshStartedAt.getTime() < STUCK_MS;
  if (running || refreshing) return "running";

  const fresh = row.status === "completed" && row.completedAt && now - row.completedAt.getTime() < env.researchRefreshDays * 86400_000;
  if (fresh && !opts.force) {
    await track("web_research_cache_hit", { ...ctx, carrierType: machine.carrierType, manufacturer: machine.manufacturer, model: machine.model });
    return "cache_hit";
  }
  if (!env.anthropicApiKey) return row.status === "completed" ? "cache_hit" : "not_configured";
  if (assessment.researchRuns >= 3 && !opts.force) return "limit_reached";

  const { hasBudget } = await import("./ai/budget");
  if (!(await hasBudget(0.1))) return row.status === "completed" ? "cache_hit" : "budget_exhausted";

  const isRefresh = row.status === "completed";
  await db().machineResearch.update({
    where: { id: row.id },
    data: isRefresh ? { refreshStartedAt: new Date() } : { status: "running", startedAt: new Date(), error: null },
  });
  await db().assessment.update({ where: { id: assessment.id }, data: { researchRuns: { increment: 1 } } });
  // Background: the HTTP response returns immediately; the client polls the assessment.
  void runResearch(row.id, machine, { ...ctx, isRefresh });
  return isRefresh ? "refreshing" : "started";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** Operator-forced refresh from /admin (ignores the 180-day freshness window). */
export async function forceRefreshResearch(researchId: string): Promise<"refreshing" | "running" | "not_configured" | "budget_exhausted" | "not_found"> {
  const row = await db().machineResearch.findUnique({ where: { id: researchId } });
  if (!row) return "not_found";
  if (!env.anthropicApiKey) return "not_configured";
  const now = Date.now();
  if ((row.status === "running" && row.startedAt && now - row.startedAt.getTime() < STUCK_MS) || (row.refreshStartedAt && now - row.refreshStartedAt.getTime() < STUCK_MS)) return "running";
  const { hasBudget } = await import("./ai/budget");
  if (!(await hasBudget(0.1))) return "budget_exhausted";
  const isRefresh = row.status === "completed";
  await db().machineResearch.update({ where: { id: row.id }, data: isRefresh ? { refreshStartedAt: new Date() } : { status: "running", startedAt: new Date(), error: null } });
  void runResearch(row.id, { carrierType: row.carrierType, manufacturer: row.manufacturer, model: row.model, year: null }, { assessmentRef: "admin", visitorRef: "admin", isRefresh });
  return "refreshing";
}
