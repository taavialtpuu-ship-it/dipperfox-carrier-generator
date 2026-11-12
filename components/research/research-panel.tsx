"use client";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Check, ExternalLink, Globe, Loader2, Pencil, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { FIELDS, type FieldKey } from "@/lib/domain";
import type { AssessmentDTO, CandidateDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import { t } from "@/lib/i18n/en";
import { type UnitSystem, formatCanonical } from "@/lib/units";
import { specValueText } from "../machine/spec-list";
import { Button, Card, ErrorNote } from "../ui";

function candidateValue(c: CandidateDTO, units: UnitSystem): string {
  const def = FIELDS[c.field];
  if (def.dimension && c.valueCanonical != null) return formatCanonical(c.valueCanonical, def.dimension, units);
  return c.valueText ? (t.options[c.valueText] ?? c.valueText) : c.originalValue;
}

const ORIGIN_LABEL: Record<string, string> = {
  official_manual: "Manufacturer manual",
  official_site: "Manufacturer website",
  dealer: "Dealer",
  other_web: "Other website (lower confidence)",
};

export function ResearchPanel({
  a,
  units,
  onData,
  onConfirm,
  onEdit,
  busy,
}: {
  a: AssessmentDTO;
  units: UnitSystem;
  onData: (a: AssessmentDTO) => void;
  onConfirm: (candidateId: string) => void;
  onEdit?: (field: FieldKey) => void;
  busy: boolean;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const start = useMutation({
    mutationFn: () => endpoints.research(a.id),
    onSuccess: (dto) => {
      setNotice((dto as AssessmentDTO & { notice?: string | null }).notice ?? null);
      onData(dto);
    },
  });
  const r = a.research;
  const specs = new Map(a.specs.map((s) => [s.field, s]));

  if (!r || r.status === "pending") {
    if (!a.capabilities.ai) return <p className="rounded-lg bg-ice px-4 py-3 text-sm text-slate">Automatic research is not available right now — please enter the values from your machine’s documentation or ask your dealer.</p>;
    return (
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Globe className="size-5 text-navy" aria-hidden />
        <p className="flex-1 text-sm">Search the manufacturer’s published specifications for this machine?</p>
        <Button variant="navy" size="sm" busy={start.isPending} onClick={() => start.mutate()}>
          Search
        </Button>
        {notice && <p className="w-full text-xs text-slate">{notice}</p>}
        {start.error && <ErrorNote message={(start.error as Error).message} />}
      </Card>
    );
  }

  if (r.status === "running")
    return (
      <Card className="p-4" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-medium text-navy">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Searching manufacturer documentation…
        </p>
        <p className="mt-1 text-xs text-slate">Reading published specifications for {a.manufacturer} {a.model}. This usually takes under a minute. You can keep answering the questions below meanwhile.</p>
      </Card>
    );

  if (r.status === "failed")
    return (
      <Card className="space-y-2 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-status-open">
          <AlertTriangle className="size-4" aria-hidden /> Research could not be completed.
        </p>
        <p className="text-xs text-slate">You can still enter the values manually from your machine’s documentation.</p>
        {a.capabilities.research && (
          <Button size="sm" busy={start.isPending} onClick={() => start.mutate()}>
            <RefreshCw className="size-3.5" aria-hidden /> Try again
          </Button>
        )}
        {notice && <p className="text-xs text-slate">{notice}</p>}
      </Card>
    );

  const visible = r.candidates.filter((c) => !dismissed.includes(c.id));
  const byField = new Map<FieldKey, CandidateDTO[]>();
  for (const c of visible) byField.set(c.field, [...(byField.get(c.field) ?? []), c]);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-navy">
          <Globe className="size-4" aria-hidden /> Found online — please confirm
        </h3>
        <span className="text-xs text-slate">
          {r.refreshing ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Updating sources…
            </span>
          ) : r.completedAt ? (
            `${r.fromCache ? "From earlier research, " : ""}retrieved ${r.completedAt.slice(0, 10)}`
          ) : null}
        </span>
      </div>
      <p className="rounded-md bg-status-open-bg px-3 py-2 text-xs text-status-open">
        Published figures describe the model in general. They may not match your machine’s year, serial range, hydraulic package or options. Confirm only what matches your machine.
      </p>
      {r.summary && <p className="text-xs text-slate">{r.summary}</p>}
      {byField.size === 0 && <p className="text-sm text-slate">No reliable published values were found. Please enter the values from your documentation or dealer.</p>}
      <ul className="space-y-3">
        {[...byField.entries()].map(([field, list]) => {
          const current = specs.get(field);
          const distinct = new Set(list.map((c) => c.valueCanonical ?? c.valueText)).size;
          return (
            <li key={field} className="rounded-lg border border-line p-3">
              <p className="text-sm font-medium">{t.fields[field].label}</p>
              {current && <p className="text-xs text-slate">Your current value: {specValueText(current, units)}</p>}
              {distinct > 1 && <p className="mt-1 text-xs font-medium text-status-open">Sources show different values — choose the one that matches your machine, or enter your own.</p>}
              <ul className="mt-2 space-y-2">
                {list.map((c) => (
                  <li key={c.id} className="rounded-md bg-surface p-2.5 text-xs">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-navy">{candidateValue(c, units)}</span>
                      <span className="text-slate">
                        as published: {c.originalValue} {c.originalUnit ?? ""}
                      </span>
                      <span className="text-slate">· confidence {c.confidence}</span>
                    </div>
                    {c.meaning && <p className="mt-1">{c.meaning}</p>}
                    {c.appliesTo && <p className="text-slate">Applies to: {c.appliesTo}</p>}
                    {c.source && (
                      <p className="mt-1 text-slate">
                        {ORIGIN_LABEL[c.source.origin] ?? c.source.origin}:{" "}
                        {c.source.url ? (
                          <a href={c.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-navy underline-offset-2 hover:underline" onClick={() => endpoints.event({ name: "source_opened", assessmentId: a.id, url: c.source!.url! })}>
                            {c.source.title ?? c.source.publisher ?? c.source.url} <ExternalLink className="size-3" aria-hidden />
                          </a>
                        ) : (
                          c.source.title
                        )}
                        {c.source.locator ? ` · ${c.source.locator}` : ""} · retrieved {c.source.retrievedAt.slice(0, 10)}
                      </p>
                    )}
                    {c.source?.excerpt && <p className="mt-1 border-l-2 border-line pl-2 italic text-slate">“{c.source.excerpt}”</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="navy" busy={busy} onClick={() => onConfirm(c.id)}>
                        <Check className="size-3.5" aria-hidden /> {t.spec.confirm}
                      </Button>
                      {onEdit && (
                        <Button size="sm" variant="secondary" onClick={() => onEdit(field)}>
                          <Pencil className="size-3.5" aria-hidden /> {t.spec.edit}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDismissed((d) => [...d, c.id])}>
                        <X className="size-3.5" aria-hidden /> Doesn’t match my machine
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate">
        Hydraulic flow and pressure published for a model are usually pump or system figures. What reaches the attachment under load can be lower — please confirm with your dealer if unsure.
      </p>
    </Card>
  );
}
