import { track } from "@/lib/analytics";
import { evaluateAndPersist, loadOwned, toDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireVisitor } from "@/lib/session";
import { patchAssessmentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  return json(await toDTO(await loadOwned(visitor.id, id)));
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  rateLimit(`write:${visitor.id}`, 120, 60_000);
  const body = await parseBody(req, patchAssessmentSchema);
  const a = await loadOwned(visitor.id, id);

  const identityChanged =
    (body.carrierType !== undefined && body.carrierType !== a.carrierType) ||
    (body.manufacturer !== undefined && body.manufacturer !== a.manufacturer) ||
    (body.model !== undefined && body.model !== a.model);

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.unitSystem !== undefined) data.unitSystem = body.unitSystem;
  if (body.carrierType !== undefined) data.carrierType = body.carrierType;
  if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
  if (body.model !== undefined) data.model = body.model;
  if (body.year !== undefined) data.year = body.year;
  // Changing the machine identity requires re-confirmation and detaches old research.
  if (identityChanged) {
    data.identityConfirmed = false;
    data.researchId = null;
  }
  if (body.identityConfirmed === true) {
    const carrierType = (body.carrierType ?? a.carrierType) as string | null;
    const manufacturer = body.manufacturer ?? a.manufacturer;
    const model = body.model ?? a.model;
    if (!carrierType || !manufacturer || !model) {
      return json({ error: { code: "identity_incomplete", message: "Carrier type, manufacturer and model are needed before confirming." } }, 400);
    }
    data.identityConfirmed = true;
    data.stage = a.stage === "intake" || a.stage === "identified" ? "gathering" : a.stage;
    if (a.title === "New assessment") data.title = `${manufacturer} ${model}`.slice(0, 120);
  } else if (body.identityConfirmed === false) data.identityConfirmed = false;

  await db().assessment.update({ where: { id }, data });
  const updated = await loadOwned(visitor.id, id);

  const common = { visitorRef: visitor.id, assessmentRef: id, carrierType: updated.carrierType, manufacturer: updated.manufacturer, model: updated.model, stage: updated.stage };
  if (body.identityConfirmed === true) await track("machine_identity_confirmed", { ...common, props: { year: updated.year } });
  if (body.title !== undefined) await track("assessment_renamed", common);
  if (body.unitSystem !== undefined && body.unitSystem !== a.unitSystem) await track("unit_system_changed", { ...common, props: { to: body.unitSystem } });

  if (identityChanged || body.identityConfirmed !== undefined) await evaluateAndPersist(updated, visitor.id);
  return json(await toDTO(await loadOwned(visitor.id, id)));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  const a = await loadOwned(visitor.id, id);
  // Hard delete: specs, messages and results cascade. Pseudonymous analytics events
  // (no contact data) are kept; enquiries keep their own snapshot.
  await db().assessment.delete({ where: { id: a.id } });
  await track("assessment_deleted", { visitorRef: visitor.id, assessmentRef: id, stage: a.stage, carrierType: a.carrierType });
  return json({ ok: true });
});
