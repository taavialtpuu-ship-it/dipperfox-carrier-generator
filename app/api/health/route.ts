import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Railway healthcheck. 200 when the app can reach PostgreSQL. */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "unavailable" | "not_configured" = "ok";
  try {
    if (!env.databaseUrl) database = "not_configured";
    else await db().$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }
  const body = {
    status: database === "ok" ? "ok" : "degraded",
    appEnv: env.appEnv,
    database,
    integrations: {
      ai: env.anthropicApiKey ? "configured" : "not_configured",
      sessionSecret: env.sessionSecret ? "configured" : "not_configured",
      admin: env.adminPassword && env.sessionSecret ? "configured" : "not_configured",
      email: "not_in_mvp",
    },
    latencyMs: Date.now() - started,
  };
  return Response.json(body, { status: database === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
