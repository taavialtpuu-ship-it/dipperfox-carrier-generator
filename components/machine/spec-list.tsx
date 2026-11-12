"use client";
import { ExternalLink, Pencil } from "lucide-react";
import { useState } from "react";
import { type CarrierType, type FieldKey, FIELDS, fieldsFor } from "@/lib/domain";
import type { AssessmentDTO, SpecDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import { t } from "@/lib/i18n/en";
import { type UnitSystem, findUnit, formatCanonical } from "@/lib/units";
import { Explain } from "../ui";
import { FieldInput, type SpecAction } from "./field-input";

export function specValueText(spec: SpecDTO | undefined, units: UnitSystem): string {
  if (!spec) return "—";
  if (spec.state === "marked_unknown") return t.spec.states.marked_unknown;
  const def = FIELDS[spec.field];
  if (def.kind === "number" && def.dimension && spec.valueCanonical != null) return formatCanonical(spec.valueCanonical, def.dimension, units);
  return spec.valueText ? (t.options[spec.valueText] ?? spec.valueText) : "—";
}

/** Every applicable field with its value, provenance and an inline editor. */
export function SpecList({ a, units, onAction, busyField }: { a: AssessmentDTO; units: UnitSystem; onAction: (x: SpecAction) => void; busyField: FieldKey | null }) {
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const specs = new Map(a.specs.map((s) => [s.field, s]));
  const fields = fieldsFor(a.carrierType as CarrierType);
  return (
    <ul className="divide-y divide-line">
      {fields.map((f) => {
        const s = specs.get(f.key);
        const isEditing = editing === f.key;
        const showOriginal = s?.enteredUnit && s.enteredValue && s.valueCanonical != null && f.dimension;
        return (
          <li key={f.key} className="py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.fields[f.key].label}</p>
                <p className={`text-sm ${s ? "text-navy" : "text-slate/70"}`}>
                  {specValueText(s, units)}
                  {showOriginal && (
                    <span className="ml-2 text-xs text-slate">
                      ({t.spec.original}: {s!.enteredValue} {findUnit(f.dimension!, s!.enteredUnit!)?.label ?? s!.enteredUnit})
                    </span>
                  )}
                </p>
                {s && (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate">
                    <span>{t.spec.states[s.state]}</span>
                    {s.source?.url && (
                      <a
                        href={s.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-navy underline-offset-2 hover:underline"
                        onClick={() => endpoints.event({ name: "source_opened", assessmentId: a.id, url: s.source!.url })}
                      >
                        {s.source.title ?? new URL(s.source.url).host} <ExternalLink className="size-3" aria-hidden />
                      </a>
                    )}
                  </p>
                )}
              </div>
              <button
                className="rounded p-1.5 text-slate hover:bg-black/5"
                aria-label={`${t.spec.edit} ${t.fields[f.key].label}`}
                aria-expanded={isEditing}
                onClick={() => setEditing(isEditing ? null : f.key)}
              >
                <Pencil className="size-4" />
              </button>
            </div>
            {isEditing && (
              <div className="mt-2 space-y-2">
                <Explain label={t.spec.explain} text={t.fields[f.key].help} />
                <FieldInput
                  field={f.key}
                  spec={s}
                  units={units}
                  compact
                  busy={busyField === f.key}
                  onAction={(x) => {
                    onAction(x);
                    setEditing(null);
                  }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
