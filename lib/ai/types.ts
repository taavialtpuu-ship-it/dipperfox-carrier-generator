/**
 * Provider-neutral AI interfaces. The deterministic CompatibilityEvaluator lives in
 * lib/compatibility/engine.ts and never calls an AI provider.
 */
import { z } from "zod";
import { CARRIER_TYPES } from "../domain";

export const machineIntentSchema = z.object({
  carrierType: z.enum(CARRIER_TYPES).nullable(),
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().int().nullable(),
  ambiguities: z.array(z.string()),
});
export type MachineIntent = z.infer<typeof machineIntentSchema>;

export interface MachineIntentExtractor {
  extract(text: string, ctx: { assessmentRef: string }): Promise<MachineIntent>;
}

export const RESEARCH_FIELDS = ["operating_weight_t", "engine_power_kw", "aux_flow_lpm", "aux_pressure_bar", "coupler_type"] as const;

export const researchCandidateSchema = z.object({
  field: z.enum(RESEARCH_FIELDS),
  value: z.number().nullable(),
  valueText: z.string().nullable(),
  unit: z.string().nullable(),
  meaning: z.string(),
  appliesTo: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  sourceUrl: z.string(),
  sourceTitle: z.string().nullable(),
  sourceType: z.enum(["official_manual", "official_site", "dealer", "other_web"]),
  excerpt: z.string(),
  locator: z.string().nullable(),
});

export const researchOutputSchema = z.object({
  summary: z.string(),
  candidates: z.array(researchCandidateSchema),
  notes: z.array(z.string()),
});
export type ResearchOutput = z.infer<typeof researchOutputSchema>;

export interface RetrievedSource {
  url: string;
  title: string | null;
  /** Fetched document text (web_fetch) when available, for excerpt verification. */
  text: string | null;
}

export interface MachineResearchProvider {
  research(
    machine: { carrierType: string; manufacturer: string; model: string; year: number | null },
    ctx: { assessmentRef: string },
  ): Promise<{ output: ResearchOutput; retrieved: RetrievedSource[]; searches: number }>;
}

export interface ConversationalGuide {
  answer(question: string, context: string, ctx: { assessmentRef: string }): Promise<string>;
}

export class AiUnavailableError extends Error {
  constructor(
    public reason: "not_configured" | "budget_exhausted" | "provider_error" | "refused" | "timeout",
    message: string,
  ) {
    super(message);
  }
}
