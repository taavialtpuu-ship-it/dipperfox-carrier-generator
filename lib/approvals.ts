/**
 * Schema for manufacturer-approved requirement files in data/product-rules/approved/*.json.
 * See docs/COMPATIBILITY_RULES.md for the approval procedure.
 */
import { z } from "zod";
import { CARRIER_TYPES, PRODUCT_IDS } from "./domain";

const PARAMETERS = [
  "carrier_weight_t",
  "engine_power_kw",
  "aux_flow_lpm",
  "aux_pressure_bar",
  "tool_mass_kg",
  "coupler_type",
  "tiltrotator_allowed",
  "bidirectional_aux_required",
  "free_return_required",
  "case_drain_required",
] as const;

export const approvedRequirementSchema = z
  .object({
    productId: z.enum(PRODUCT_IDS),
    productRevision: z.string().min(1).nullable().optional(),
    carrierType: z.enum(CARRIER_TYPES),
    parameter: z.enum(PARAMETERS),
    min: z.number().finite().nullable().optional(),
    max: z.number().finite().nullable().optional(),
    value: z.number().finite().nullable().optional(),
    allowedValues: z.array(z.string().min(1)).optional(),
    ruleKind: z.enum(["hard_limit", "recommended_range", "unclassified"]),
    unit: z.string().min(1),
    sourceUrl: z.string().url(),
    sourceTitle: z.string().min(1),
    sourceRevision: z.string().min(1),
    checkedAt: z.string().date(),
    remedyKind: z.enum(["regulated_setting", "adapter", "installation_kit"]).nullable().optional(),
    remedyDescription: z.string().min(1).nullable().optional(),
    remedySourceUrl: z.string().url().nullable().optional(),
    note: z.string().nullable().optional(),
  })
  .refine((r) => r.min != null || r.max != null || r.value != null || (r.allowedValues?.length ?? 0) > 0, {
    message: "A requirement needs min, max, value or allowedValues",
  })
  .refine((r) => !r.remedyKind || (r.remedyDescription && r.remedySourceUrl), {
    message: "A documented remedy needs a description and a source URL",
  });

export const approvalFileSchema = z.object({
  ruleSetVersion: z
    .string()
    .regex(/^approved-[a-z0-9.-]+$/, "ruleSetVersion must start with 'approved-'")
    .refine((v) => !v.includes("synthetic"), "Synthetic test rules must never be imported"),
  description: z.string().min(5),
  approvedBy: z.string().min(2),
  approvedAt: z.string().date(),
  sourceDocument: z.string().min(3),
  requirements: z.array(approvedRequirementSchema).min(1),
});

export type ApprovalFile = z.infer<typeof approvalFileSchema>;
