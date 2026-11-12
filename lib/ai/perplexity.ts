import "server-only";
import { z } from "zod";
import { env } from "../env";
import { log } from "../log";
import { normUrl } from "../research-grounding";
import { extractFromSources } from "./anthropic";
import { hasBudget, recordUsage } from "./budget";
import { AiUnavailableError, type MachineResearchProvider, type RetrievedSource } from "./types";

/**
 * Web research via the Perplexity Search API (POST https://api.perplexity.ai/search):
 * real ranked web results with extracted page text. Claude then reads ONLY those pages
 * and extracts candidates; grounding (lib/research-grounding.ts) keeps a candidate only
 * if its URL was returned here and the number appears in that page's text.
 */
const ENDPOINT = "https://api.perplexity.ai/search";

const resultSchema = z.object({
  title: z.string().nullish(),
  url: z.string(),
  snippet: z.string().nullish(),
  date: z.string().nullish(),
  last_updated: z.string().nullish(),
});
const responseSchema = z.object({
  id: z.string().optional(),
  // Flat list per the docs; tolerate a per-query nested list as well.
  results: z.array(z.union([resultSchema, z.array(resultSchema)])),
});

export function buildQueries(m: { manufacturer: string; model: string; year: number | null; carrierType: string }): string[] {
  const name = `${m.manufacturer} ${m.model}`.trim();
  const type = m.carrierType.replace(/_/g, " ");
  return [
    `${name} ${type} specifications operating weight engine power`,
    `${name} auxiliary hydraulics flow l/min pressure bar`,
    `${name}${m.year ? ` ${m.year}` : ""} spec sheet brochure pdf`,
  ];
}

export function flattenResults(raw: z.infer<typeof responseSchema>["results"]): RetrievedSource[] {
  const seen = new Map<string, RetrievedSource>();
  for (const r of raw.flat()) {
    if (!/^https?:\/\//i.test(r.url)) continue;
    const key = normUrl(r.url);
    const prev = seen.get(key);
    const text = r.snippet ?? null;
    if (!prev) seen.set(key, { url: r.url, title: r.title ?? null, text });
    else if (text && (!prev.text || text.length > prev.text.length)) prev.text = text;
  }
  return [...seen.values()].filter((s) => s.text && s.text.length > 40);
}

export const perplexityResearchProvider: MachineResearchProvider = {
  async research(machine, ctx) {
    if (!env.perplexityApiKey) throw new AiUnavailableError("not_configured", "Web search is not configured.");
    if (!env.anthropicApiKey) throw new AiUnavailableError("not_configured", "AI extraction is not configured.");
    if (!(await hasBudget(0.08))) throw new AiUnavailableError("budget_exhausted", "Automatic research is paused for today. You can still enter values manually.");

    const queries = buildQueries(machine);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    let data: z.infer<typeof responseSchema>;
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.perplexityApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queries,
          max_results: Math.min(10, Math.max(3, env.aiMaxSearchesPerResearch * 2)),
          max_tokens_per_page: 3000,
          max_tokens: 30000,
        }),
        signal: controller.signal,
      });
      await recordUsage({ purpose: "research_search", model: "perplexity-search", inputTokens: 0, outputTokens: 0, webSearches: 0, costUsd: env.perplexitySearchUsd, assessmentRef: ctx.assessmentRef, ok: res.ok });
      if (!res.ok) {
        log.error("perplexity_error", { status: res.status, body: (await res.text()).slice(0, 300) });
        throw new AiUnavailableError("provider_error", "Web search is temporarily unavailable.");
      }
      const parsed = responseSchema.safeParse(await res.json());
      if (!parsed.success) {
        log.error("perplexity_bad_response", { issues: parsed.error.issues.slice(0, 3).map((i) => i.message) });
        throw new AiUnavailableError("provider_error", "Web search returned an unexpected response.");
      }
      data = parsed.data;
    } catch (e) {
      if (e instanceof AiUnavailableError) throw e;
      if (e instanceof Error && e.name === "AbortError") throw new AiUnavailableError("timeout", "Web search took too long.");
      log.error("perplexity_fetch_failed", { msg: e instanceof Error ? e.message : String(e) });
      throw new AiUnavailableError("provider_error", "Web search is temporarily unavailable.");
    } finally {
      clearTimeout(timer);
    }

    const retrieved = flattenResults(data.results).slice(0, 12);
    log.info("perplexity_results", { queries: queries.length, pages: retrieved.length });
    if (retrieved.length === 0) return { output: { summary: "No relevant pages were found.", candidates: [], notes: [] }, retrieved, searches: queries.length };

    const machineText = `${machine.manufacturer} ${machine.model}${machine.year ? ` (${machine.year})` : ""}, carrier type: ${machine.carrierType.replace(/_/g, " ")}`;
    const output = await extractFromSources(machineText, retrieved, ctx);
    return { output, retrieved, searches: queries.length };
  },
};
