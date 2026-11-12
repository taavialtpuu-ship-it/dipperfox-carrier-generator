import "server-only";

/**
 * Server-side configuration. Read lazily so `next build` works without secrets.
 * Never import this from client components.
 */
export const env = {
  get appEnv(): "development" | "test" | "production" {
    const v = process.env.APP_ENV;
    return v === "production" || v === "test" ? v : "development";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get sessionSecret() {
    return process.env.SESSION_SECRET ?? "";
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD ?? "";
  },
  get anthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY ?? "";
  },
  /** Daily AI spend ceiling enforced by the app (USD). */
  get aiDailyBudgetUsd() {
    return num(process.env.AI_DAILY_BUDGET_USD, 0.3);
  },
  get aiMaxSearchesPerResearch() {
    return num(process.env.AI_MAX_SEARCHES_PER_RESEARCH, 5);
  },
  get maxAssessmentsPerVisitorPerDay() {
    return num(process.env.MAX_ASSESSMENTS_PER_VISITOR_PER_DAY, 5);
  },
  get maxQuestionsPerAssessment() {
    return num(process.env.MAX_QUESTIONS_PER_ASSESSMENT, 5);
  },
  get researchRefreshDays() {
    return num(process.env.RESEARCH_REFRESH_DAYS, 180);
  },
  get aiModelFast() {
    return process.env.AI_MODEL_FAST ?? "claude-haiku-5-5";
  },
  get aiModelResearch() {
    return process.env.AI_MODEL_RESEARCH ?? "claude-sonnet-5-5";
  },
};

function num(v: string | undefined, fallback: number): number {
  const n = v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
