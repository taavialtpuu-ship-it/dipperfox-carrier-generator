import { evaluateAndPersist, loadOwned, toDTO } from "@/lib/assessments";
import { handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireVisitor } from "@/lib/session";
import { applySpecAction } from "@/lib/specs";
import { specActionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Set, confirm, mark unknown or clear one machine field; re-evaluates deterministically. */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  rateLimit(`write:${visitor.id}`, 120, 60_000);
  const body = await parseBody(req, specActionSchema);
  const a = await loadOwned(visitor.id, id);
  await applySpecAction(a, body, visitor.id);
  const updated = await loadOwned(visitor.id, id);
  await evaluateAndPersist(updated, visitor.id);
  return json(await toDTO(await loadOwned(visitor.id, id)));
});
