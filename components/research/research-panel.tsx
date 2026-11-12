"use client";
import type { AssessmentDTO } from "@/lib/dto";
import type { UnitSystem } from "@/lib/units";

/** Web research suggestions (implemented in stage 3). */
export function ResearchPanel(_props: { a: AssessmentDTO; units: UnitSystem; onData: (a: AssessmentDTO) => void; onConfirm: (candidateId: string) => void; busy: boolean }) {
  return null;
}
