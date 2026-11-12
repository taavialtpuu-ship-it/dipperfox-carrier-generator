import { track } from "@/lib/analytics";
import { assessmentInclude, toDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import type { AssessmentSummaryDTO } from "@/lib/dto";
import { env } from "@/lib/env";
import { handler, json, parseBody, tooMany } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { currentVisitor, getOrCreateVisitor } from "@/lib/session";
import { createAssessmentSchema } from "@/lib/validation";

/** List the current anonymous visitor's assessments. */
export const GET = handler(async () => {
  const visitor = await currentVisitor();
  if (!visitor) return json({ assessments: [] });
  const rows = await db().assessment.findMany({
    where: { visitorId: visitor.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, stage: true, carrierType: true, manufacturer: true, model: true, updatedAt: true },
  });
  const assessments: AssessmentSummaryDTO[] = rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
  return json({ assessments });
});

/** Start a new assessment (creates the anonymous session on first use). */
export const POST = handler(async (req: Request) => {
  rateLimit(`create:${clientIp(req)}`, 20, 3600_000);
  const body = await parseBody(req, createAssessmentSchema);
  const visitor = await getOrCreateVisitor();
  const since = new Date(Date.now() - 86400_000);
  const recent = await db().assessment.count({ where: { visitorId: visitor.id, createdAt: { gte: since } } });
  if (recent >= env.maxAssessmentsPerVisitorPerDay)
    throw tooMany(`You can start up to ${env.maxAssessmentsPerVisitorPerDay} assessments per day. Please continue an existing one from your history.`);
  const a = await db().assessment.create({
    data: { visitorId: visitor.id, title: body.title || "New assessment" },
    include: assessmentInclude,
  });
  await track("assessment_started", {
    visitorRef: visitor.id,
    assessmentRef: a.id,
    stage: "intake",
    utm: body.utm ?? null,
    props: { newVisitor: visitor.isNew },
  });
  return json(await toDTO(a), 201);
});
