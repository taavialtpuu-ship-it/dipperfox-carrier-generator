/** Shapes exchanged between API and UI. Safe for client import. */
import type { EvaluationResult } from "./compatibility/types";
import type { FieldKey, SpecOrigin, SpecState } from "./domain";
import type { NextStep } from "./guide";

export interface SourceDTO {
  id: string;
  origin: SpecOrigin | string;
  url: string | null;
  title: string | null;
  publisher: string | null;
  locator: string | null;
  excerpt: string | null;
  retrievedAt: string;
}

export interface SpecDTO {
  field: FieldKey;
  state: SpecState;
  valueCanonical: number | null;
  valueText: string | null;
  enteredValue: string | null;
  enteredUnit: string | null;
  origin: SpecOrigin;
  source: SourceDTO | null;
  updatedAt: string;
}

export interface CandidateDTO {
  id: string;
  field: FieldKey;
  valueCanonical: number | null;
  valueText: string | null;
  originalValue: string;
  originalUnit: string | null;
  meaning: string | null;
  appliesTo: string | null;
  confidence: string;
  source: SourceDTO | null;
}

export interface ResearchDTO {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  error: string | null;
  summary: string | null;
  completedAt: string | null;
  refreshing: boolean;
  fromCache: boolean;
  candidates: CandidateDTO[];
  sources: SourceDTO[];
}

export interface MessageDTO {
  id: string;
  role: "user" | "assistant" | "system";
  kind: string;
  content: string;
  createdAt: string;
}

export interface AssessmentSummaryDTO {
  id: string;
  title: string;
  stage: string;
  carrierType: string | null;
  manufacturer: string | null;
  model: string | null;
  updatedAt: string;
}

export interface AssessmentDTO extends AssessmentSummaryDTO {
  initialInput: string | null;
  year: number | null;
  identityConfirmed: boolean;
  unitSystem: "metric" | "us";
  createdAt: string;
  questionsAsked: number;
  specs: SpecDTO[];
  evaluation: EvaluationResult;
  research: ResearchDTO | null;
  messages: MessageDTO[];
  next: NextStep;
  /** Latest enquiry sent for this assessment (no contact details). */
  enquiry: { submittedAt: string; type: string } | null;
  capabilities: { ai: boolean; research: boolean; questionsRemaining: number };
}

export interface ProductDTO {
  id: string;
  name: string;
  pageUrl: string;
  imagePath: string;
  cuttingDiameterMm: number | null;
  grindingDepthMm: number | null;
  massKg: number | null;
  torqueNm: number | null;
  suitability: string;
}

export interface RequirementDTO {
  id: string;
  productId: string;
  carrierType: string;
  parameter: string;
  min: number | null;
  max: number | null;
  value: number | null;
  ruleKind: string;
  unit: string;
  status: string;
  conflictGroup: string | null;
  sourceRef: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  checkedAt: string | null;
  note: string | null;
  ruleSetVersion: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface CatalogDTO {
  products: ProductDTO[];
  requirements: RequirementDTO[];
  appEnv: string;
}

export interface ApiError {
  error: { code: string; message: string };
}
