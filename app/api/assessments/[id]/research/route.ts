import { z } from "zod";
import { loadOwned, toDTO } from "@/lib/assessments";
import { HttpError, handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { startResearch } from "@/lib/research";
import { requireVisitor } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

const MESSAGES: Record<string, string> = {
  not_configured: "Automatic research is not available right now. Please enter the values manually.",
  budget_exhausted: "Automatic research is paused for today. Please enter the values manually.",
  limit_reached: "Research has already been run for this assessment.",
};

/** Start (or re-attach cached) web research for the confirmed machine. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  rateLimit(`research:${visitor.id}`, 5, 60_000);
  await parseBody(req, z.object({ refresh: z.boolean().optional() }));
  const a = await loadOwned(visitor.id, id);
  if (!a.identityConfirmed || !a.carrierType || !a.manufacturer || !a.model)
    throw new HttpError(400, "identity_unconfirmed", "Confirm the machine first.");
  const result = await startResearch(
    { id: a.id, carrierType: a.carrierType, manufacturer: a.manufacturer, model: a.model, year: a.year, researchRuns: a.researchRuns },
    visitor.id,
  );
  const dto = await toDTO(await loadOwned(visitor.id, id));
  return json({ ...dto, notice: MESSAGES[result] ?? null });
});
