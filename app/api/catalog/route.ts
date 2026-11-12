import { requirementToDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import type { CatalogDTO } from "@/lib/dto";
import { env } from "@/lib/env";
import { handler, json } from "@/lib/http";

/** Products and their (draft/conflicting/approved) requirements with provenance. */
export const GET = handler(async () => {
  const [products, reqs] = await Promise.all([
    db().product.findMany({ orderBy: { sortOrder: "asc" } }),
    db().productRequirement.findMany({ where: { status: { not: "superseded" } }, orderBy: [{ productId: "asc" }, { parameter: "asc" }] }),
  ]);
  const body: CatalogDTO = {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      pageUrl: p.pageUrl,
      imagePath: p.imagePath,
      cuttingDiameterMm: p.cuttingDiameterMm,
      grindingDepthMm: p.grindingDepthMm,
      massKg: p.massKg,
      torqueNm: p.torqueNm,
      suitability: p.suitability,
    })),
    requirements: reqs.map(requirementToDTO),
    appEnv: env.appEnv,
  };
  return json(body);
});
