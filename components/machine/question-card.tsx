"use client";
import { Check, ExternalLink, Globe } from "lucide-react";
import { FIELDS, type FieldKey } from "@/lib/domain";
import type { AssessmentDTO, CandidateDTO, SpecDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import { t } from "@/lib/i18n/en";
import { type UnitSystem, formatCanonical } from "@/lib/units";
import { Button, Card, Explain } from "../ui";
import { FieldInput, type SpecAction } from "./field-input";

function candidateValue(c: CandidateDTO, units: UnitSystem): string {
  const def = FIELDS[c.field];
  if (def.dimension && c.valueCanonical != null) return formatCanonical(c.valueCanonical, def.dimension, units);
  return c.valueText ? (t.options[c.valueText] ?? c.valueText) : c.originalValue;
}

/**
 * One question at a time. If research found published values for this field, they are
 * offered right here as one-click answers (with source), next to manual entry.
 */
export function QuestionCard({
  a,
  field,
  spec,
  units,
  busy,
  onAction,
  onConfirm,
  onSkip,
}: {
  a: AssessmentDTO;
  field: FieldKey;
  spec?: SpecDTO;
  units: UnitSystem;
  busy: boolean;
  onAction: (x: SpecAction) => void;
  onConfirm: (candidateId: string) => void;
  onSkip: () => void;
}) {
  const candidates = (a.research?.candidates ?? []).filter((c) => c.field === field);
  const distinct = new Set(candidates.map((c) => c.valueCanonical ?? c.valueText)).size;
  return (
    <Card id="next-question" className="border-navy/30 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange">{t.spec.nextQuestion}</p>
      <h3 className="mt-1 font-semibold text-navy">{t.fields[field].question}</h3>
      <div className="mt-1">
        <Explain label={t.spec.explain} text={t.fields[field].help} />
      </div>

      {candidates.length > 0 && (
        <div className="mt-3 space-y-2 rounded-lg bg-ice p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-navy">
            <Globe className="size-3.5" aria-hidden /> {distinct > 1 ? "Published values differ — pick the one for your machine:" : "Published value found:"}
          </p>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-2 text-xs">
                <Button size="sm" variant="navy" busy={busy} onClick={() => onConfirm(c.id)} aria-label={`Use ${candidateValue(c, units)}`}>
                  <Check className="size-3.5" aria-hidden /> Use {candidateValue(c, units)}
                </Button>
                <div className="min-w-0 flex-1 text-slate">
                  {c.meaning && <p className="text-ink">{c.meaning}</p>}
                  {c.appliesTo && <p>Applies to: {c.appliesTo}</p>}
                  {c.source?.url && (
                    <a
                      href={c.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-navy underline-offset-2 hover:underline"
                      onClick={() => endpoints.event({ name: "source_opened", assessmentId: a.id, url: c.source!.url! })}
                    >
                      {c.source.title ?? c.source.publisher ?? "Source"} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate">Use a published value only if it matches your machine’s year and configuration. Otherwise enter your own below.</p>
        </div>
      )}

      <div className="mt-3">
        <FieldInput key={field} field={field} spec={spec} units={units} busy={busy} onAction={onAction} />
      </div>
      <button className="mt-3 text-xs text-slate underline-offset-2 hover:underline" onClick={onSkip}>
        {t.spec.skip}
      </button>
    </Card>
  );
}
