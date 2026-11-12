import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { handler, json, parseBody } from "@/lib/http";
import { forceRefreshResearch } from "@/lib/research";

/** Admin: force a fresh web search for a cached machine. */
export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const { researchId } = await parseBody(req, z.object({ researchId: z.string().uuid() }));
  return json({ result: await forceRefreshResearch(researchId) });
});
