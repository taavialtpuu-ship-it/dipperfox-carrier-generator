import { track } from "@/lib/analytics";
import { db } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { currentVisitor } from "@/lib/session";
import { clientEventSchema } from "@/lib/validation";

/** UI-only events. Ownership-checked and throttled; business events are recorded server-side. */
export const POST = handler(async (req: Request) => {
  const visitor = await currentVisitor();
  if (!visitor) return json({ ok: true });
  rateLimit(`events:${visitor.id}`, 60, 60_000);
  const body = await parseBody(req, clientEventSchema);
  let a: { id: string; stage: string; carrierType: string | null; manufacturer: string | null; model: string | null } | null = null;
  if (body.assessmentId) {
    a = await db().assessment.findFirst({
      where: { id: body.assessmentId, visitorId: visitor.id },
      select: { id: true, stage: true, carrierType: true, manufacturer: true, model: true },
    });
    if (!a) return json({ ok: true });
  }
  let host: string | null = null;
  if (body.url) {
    try {
      host = new URL(body.url).host;
    } catch {}
  }
  await track(body.name, {
    visitorRef: visitor.id,
    assessmentRef: a?.id ?? null,
    stage: a?.stage ?? null,
    carrierType: a?.carrierType ?? null,
    manufacturer: a?.manufacturer ?? null,
    model: a?.model ?? null,
    productId: body.productId ?? null,
    props: host ? { sourceHost: host } : undefined,
  });
  return json({ ok: true });
});
