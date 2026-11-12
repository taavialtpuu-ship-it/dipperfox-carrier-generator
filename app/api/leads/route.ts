import { track } from "@/lib/analytics";
import { loadOwned, toDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError, handler, json, parseBody } from "@/lib/http";
import { PRIVACY_NOTICE_VERSION, buildLeadSnapshot } from "@/lib/leads";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requireVisitor } from "@/lib/session";
import { leadSchema } from "@/lib/validation";
import type { Prisma } from "@/lib/generated/prisma/client";



/**
 * Store an enquiry with the full assessment snapshot in PostgreSQL.
 * MVP: no email is sent — enquiries are reviewed in /admin and exported as CSV.
 */
export const POST = handler(async (req: Request) => {
  rateLimit(`lead-ip:${clientIp(req)}`, 10, 3600_000);
  const visitor = await requireVisitor();
  rateLimit(`lead:${visitor.id}`, 3, 3600_000);
  const body = await parseBody(req, leadSchema);
  if (body.website) return json({ ok: true, id: "ignored" }); // honeypot — silently drop bots
  const a = await loadOwned(visitor.id, body.assessmentId);

  const dup = await db().leadEnquiry.findFirst({
    where: { assessmentId: a.id, email: body.email, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    select: { id: true },
  });
  if (dup) return json({ ok: true, id: dup.id, duplicate: true });

  const dto = await toDTO(a);
  const snapshot = buildLeadSnapshot(dto, env.appEnv);
  if (!snapshot.machine.manufacturer && !snapshot.machine.model && !body.message)
    throw new HttpError(400, "empty_enquiry", "Please describe your machine or add a message so Dipperfox can help.");

  const lead = await db().leadEnquiry.create({
    data: {
      assessmentId: a.id,
      enquiryType: body.enquiryType,
      name: body.name,
      email: body.email,
      country: body.country,
      company: body.company || null,
      phone: body.phone || null,
      message: body.message || null,
      privacyAcceptedAt: new Date(),
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      appEnv: env.appEnv,
    },
    select: { id: true },
  });
  await db().assessment.update({ where: { id: a.id }, data: { stage: "enquiry" } });
  await track("lead_submitted", {
    visitorRef: visitor.id,
    assessmentRef: a.id,
    stage: "enquiry",
    carrierType: a.carrierType,
    manufacturer: a.manufacturer,
    model: a.model,
    status: body.enquiryType,
    props: {
      conversion: true,
      bestCandidate: dto.evaluation.bestCandidate,
      outcomes: Object.fromEntries(dto.evaluation.products.map((p) => [p.productId, p.preliminary.status])),
    },
  });
  return json({ ok: true, id: lead.id }, 201);
});
