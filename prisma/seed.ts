/**
 * Deterministic, repeatable seed. Runs in Railway's pre-deploy step after migrations.
 *  1. Upserts the three Dipperfox products.
 *  2. Inserts draft/conflicting v0.1 requirements (updates them only while still draft/conflicting).
 *  3. Imports approved rule files from data/product-rules/approved/*.json — each version once,
 *     superseding (never deleting) earlier records for the same product/carrier/parameter.
 * Never modifies approved or superseded records.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DRAFT_REQUIREMENTS, DRAFT_RULE_SET, PRODUCTS, SOURCE_CHECKED_AT, SOURCES } from "../data/products";
import { approvalFileSchema } from "../lib/approvals";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — skipping seed.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function seedProducts() {
  for (const p of PRODUCTS) {
    await prisma.product.upsert({ where: { id: p.id }, create: p, update: p });
  }
}

async function seedDrafts() {
  await prisma.productRuleSet.upsert({
    where: { version: DRAFT_RULE_SET.version },
    create: { ...DRAFT_RULE_SET, kind: "draft" },
    update: { description: DRAFT_RULE_SET.description, sourceDocument: DRAFT_RULE_SET.sourceDocument },
  });
  let created = 0;
  let updated = 0;
  for (const r of DRAFT_REQUIREMENTS) {
    const src = SOURCES[r.sourceRef];
    const data = {
      productId: r.productId,
      carrierType: r.carrierType,
      parameter: r.parameter,
      min: r.min ?? null,
      max: r.max ?? null,
      value: r.value ?? null,
      allowedValues: [],
      ruleKind: r.ruleKind,
      unit: r.unit,
      status: r.status,
      conflictGroup: r.conflictGroup ?? null,
      sourceRef: r.sourceRef,
      sourceUrl: src.url,
      sourceTitle: src.title,
      sourceRevision: "Dipperfox source document v0.1",
      checkedAt: new Date(SOURCE_CHECKED_AT),
      note: r.note ?? null,
      ruleSetVersion: DRAFT_RULE_SET.version,
    };
    const existing = await prisma.productRequirement.findUnique({ where: { key: r.key } });
    if (!existing) {
      await prisma.productRequirement.create({ data: { key: r.key, ...data } });
      created++;
    } else if (existing.status === "draft" || existing.status === "conflicting") {
      await prisma.productRequirement.update({ where: { key: r.key }, data });
      updated++;
    }
  }
  console.log(`draft requirements: ${created} created, ${updated} refreshed`);
}

async function importApprovals() {
  const dir = path.join(process.cwd(), "data", "product-rules", "approved");
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  for (const f of files) {
    const parsed = approvalFileSchema.safeParse(JSON.parse(readFileSync(path.join(dir, f), "utf8")));
    if (!parsed.success) {
      console.error(`REFUSED ${f}:`, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      process.exitCode = 1;
      continue;
    }
    const file = parsed.data;
    if (await prisma.productRuleSet.findUnique({ where: { version: file.ruleSetVersion } })) {
      console.log(`approved rule set ${file.ruleSetVersion} already imported — skipping`);
      continue;
    }
    const approvedAt = new Date(file.approvedAt);
    await prisma.$transaction(async (tx) => {
      await tx.productRuleSet.create({
        data: { version: file.ruleSetVersion, description: file.description, kind: "approved", sourceDocument: file.sourceDocument, approvedBy: file.approvedBy, approvedAt },
      });
      for (const [i, r] of file.requirements.entries()) {
        await tx.productRequirement.updateMany({
          where: { productId: r.productId, carrierType: r.carrierType, parameter: r.parameter, status: { not: "superseded" } },
          data: { status: "superseded", supersededAt: new Date() },
        });
        // Approved engine power uses parameter "engine_power_kw"; retire the draft-only variants too.
        if (r.parameter === "engine_power_kw") {
          await tx.productRequirement.updateMany({
            where: { productId: r.productId, carrierType: r.carrierType, parameter: { in: ["engine_power_kw_min", "engine_power_kw_range"] }, status: { not: "superseded" } },
            data: { status: "superseded", supersededAt: new Date() },
          });
        }
        await tx.productRequirement.create({
          data: {
            key: `${file.ruleSetVersion}:${r.productId}:${r.carrierType}:${r.parameter}:${i}`,
            productId: r.productId,
            productRevision: r.productRevision ?? null,
            carrierType: r.carrierType,
            parameter: r.parameter,
            min: r.min ?? null,
            max: r.max ?? null,
            value: r.value ?? null,
            allowedValues: r.allowedValues ?? [],
            ruleKind: r.ruleKind,
            unit: r.unit,
            status: "approved",
            sourceUrl: r.sourceUrl,
            sourceTitle: r.sourceTitle,
            sourceRevision: r.sourceRevision,
            checkedAt: new Date(r.checkedAt),
            remedyKind: r.remedyKind ?? null,
            remedyDescription: r.remedyDescription ?? null,
            remedySourceUrl: r.remedySourceUrl ?? null,
            note: r.note ?? null,
            approvedBy: file.approvedBy,
            approvedAt,
            ruleSetVersion: file.ruleSetVersion,
          },
        });
      }
    });
    console.log(`imported approved rule set ${file.ruleSetVersion} (${file.requirements.length} requirements) approved by ${file.approvedBy}`);
  }
}

async function main() {
  await seedProducts();
  await seedDrafts();
  await importApprovals();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
