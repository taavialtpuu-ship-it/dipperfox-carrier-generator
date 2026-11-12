import "server-only";
import { db } from "../db";
import { env } from "../env";
import { log } from "../log";

/** USD per million tokens (first-party API list prices, 2026-11). Update if prices change. */
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-opus-5-5": { in: 4, out: 20 },
};
const WEB_SEARCH_USD = 0.01;

export function estimateCost(model: string, inputTokens: number, outputTokens: number, webSearches: number): number {
  const p = PRICES[model] ?? PRICES["claude-sonnet-5-5"];
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000 + webSearches * WEB_SEARCH_USD;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function spentToday(): Promise<number> {
  const r = await db().aiUsage.aggregate({ where: { day: today() }, _sum: { costUsd: true } });
  return r._sum.costUsd ?? 0;
}

/** True if the app-side daily budget still has room for a call of roughly this cost. */
export async function hasBudget(estimatedUsd: number): Promise<boolean> {
  return (await spentToday()) + estimatedUsd <= env.aiDailyBudgetUsd;
}

export async function recordUsage(u: {
  purpose: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  webSearches?: number;
  assessmentRef?: string | null;
  ok?: boolean;
  /** Explicit cost for non-token-priced calls (e.g. Perplexity Search requests). */
  costUsd?: number;
}): Promise<number> {
  const cost = u.costUsd ?? estimateCost(u.model, u.inputTokens, u.outputTokens, u.webSearches ?? 0);
  try {
    await db().aiUsage.create({
      data: {
        day: today(),
        purpose: u.purpose,
        model: u.model,
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        webSearches: u.webSearches ?? 0,
        costUsd: cost,
        assessmentRef: u.assessmentRef ?? null,
        ok: u.ok ?? true,
      },
    });
  } catch (e) {
    log.warn("ai_usage_write_failed", { msg: e instanceof Error ? e.message : String(e) });
  }
  log.info("ai_usage", { purpose: u.purpose, model: u.model, in: u.inputTokens, out: u.outputTokens, searches: u.webSearches ?? 0, usd: Number(cost.toFixed(4)) });
  return cost;
}
