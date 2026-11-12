import { z } from "zod";
import { CARRIER_TYPES, FIELD_KEYS } from "./domain";

const shortText = (max: number) => z.string().trim().max(max);

export const utmSchema = z
  .object({ source: shortText(100).optional(), medium: shortText(100).optional(), campaign: shortText(100).optional() })
  .partial()
  .optional()
  .nullable();

export const createAssessmentSchema = z.object({
  title: shortText(120).optional(),
  utm: utmSchema,
});

export const patchAssessmentSchema = z
  .object({
    title: shortText(120).min(1).optional(),
    unitSystem: z.enum(["metric", "us"]).optional(),
    carrierType: z.enum(CARRIER_TYPES).nullable().optional(),
    manufacturer: shortText(80).nullable().optional(),
    model: shortText(80).nullable().optional(),
    year: z.number().int().min(1950).max(2100).nullable().optional(),
    identityConfirmed: z.boolean().optional(),
  })
  .strict();

export const specActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_number"), field: z.enum(FIELD_KEYS), value: z.number().finite(), unit: shortText(20) }),
  z.object({ action: z.literal("set_choice"), field: z.enum(FIELD_KEYS), value: shortText(60) }),
  z.object({ action: z.literal("unknown"), field: z.enum(FIELD_KEYS) }),
  z.object({ action: z.literal("clear"), field: z.enum(FIELD_KEYS) }),
  z.object({ action: z.literal("confirm_candidate"), candidateId: z.string().uuid() }),
]);

export const describeMachineSchema = z.object({ text: shortText(500).min(2) });

export const questionSchema = z.object({ text: shortText(600).min(2) });

export const clientEventSchema = z.object({
  name: z.enum(["source_opened", "compatibility_result_viewed", "lead_form_opened", "assessment_reopened"]),
  assessmentId: z.string().uuid().optional(),
  productId: z.enum(["sc400", "sc600", "sc850pro"]).optional(),
  url: z.string().url().max(500).optional(),
});

export const leadSchema = z.object({
  assessmentId: z.string().uuid(),
  enquiryType: z.enum(["quote", "technical_verification", "question"]),
  name: shortText(120).min(1),
  email: z.string().trim().toLowerCase().email().max(200),
  country: shortText(80).min(2),
  company: shortText(160).optional().or(z.literal("")),
  phone: shortText(40).regex(/^[+()\d\s.-]*$/, "Invalid phone number").optional().or(z.literal("")),
  message: shortText(2000).optional().or(z.literal("")),
  privacyAccepted: z.literal(true),
  /** Honeypot: must be empty. */
  website: z.string().max(0).optional().or(z.literal("")),
});
