"use client";
import clsx from "clsx";
import { ChevronDown, ExternalLink, Star } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { actualText, preliminaryReasons, refText, strictReason } from "@/lib/compatibility/explain";
import type { ProductEvaluation } from "@/lib/compatibility/types";
import type { ProductDTO } from "@/lib/dto";
import { t } from "@/lib/i18n/en";
import { type UnitSystem, formatCanonical } from "@/lib/units";
import { OutcomeIcon, PrelimBadge, StrictBadge } from "./status";

export function ProductCard({
  product,
  ev,
  units,
  best,
  onAsk,
}: {
  product: ProductDTO;
  ev: ProductEvaluation;
  units: UnitSystem;
  best: boolean;
  onAsk?: (field: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reasons = preliminaryReasons(ev, units);
  const strictPending = ev.strict.checks.find((c) => c.key === "carrier_type_rules")?.outcome !== "pass";
  return (
    <article className={clsx("flex flex-col rounded-xl border bg-white", best ? "border-navy shadow-[0_0_0_1px_var(--color-navy)]" : "border-line")} aria-labelledby={`${id}-name`}>
      <div className="flex gap-3 p-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-ice">
          <Image src={product.imagePath} alt={`Dipperfox ${product.name} stump grinder`} fill sizes="80px" className="object-contain p-1" />
        </div>
        <div className="min-w-0 flex-1">
          {best && (
            <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              <Star className="size-3" aria-hidden /> {t.outcomes.bestCandidate}
            </p>
          )}
          <h3 id={`${id}-name`} className="text-lg font-bold text-navy">
            Dipperfox {product.name}
          </h3>
          <div className="mt-1">
            <PrelimBadge status={ev.preliminary.status} />
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <ul className="space-y-1 text-sm text-ink">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-navy/40" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {ev.suitability && (
          <p className="rounded-md bg-surface px-3 py-2 text-xs text-slate">
            {ev.suitability === "matches_intended_work" ? t.outcomes.matchesWork : t.outcomes.otherWork} {product.suitability}.
          </p>
        )}
        <p className="text-xs text-slate">{t.outcomes.disclaimerCard}</p>
        <StrictBadge status={ev.strict.status} pending={strictPending} />
        <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
          <div>
            <dt className="text-slate">{t.card.cutting}</dt>
            <dd className="font-medium">{product.cuttingDiameterMm != null ? formatCanonical(product.cuttingDiameterMm, "length", units) : "—"}</dd>
          </div>
          <div>
            <dt className="text-slate">{t.card.mass}</dt>
            <dd className="font-medium">{product.massKg != null ? formatCanonical(product.massKg, "mass_kg", units) : "—"}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={`${id}-details`}
            className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
          >
            {open ? t.card.hideDetails : t.card.details}
            <ChevronDown className={clsx("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
          <a href={product.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-slate hover:text-navy">
            {t.card.productPage} <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>

      {open && (
        <div id={`${id}-details`} className="space-y-4 border-t border-line bg-surface/60 p-4 text-sm">
          <section>
            <h4 className="mb-2 font-semibold text-navy">{t.card.preliminaryChecks}</h4>
            <ul className="space-y-2">
              {ev.preliminary.checks.map((c) => (
                <li key={c.key} className="flex gap-2">
                  <OutcomeIcon outcome={c.outcome} />
                  <div className="min-w-0">
                    <p className="font-medium">{t.checks[c.key]}</p>
                    <p className="text-xs text-slate">
                      {t.card.yourValue}: {actualText(c, units)} · {t.card.published}: {c.references.length ? c.references.map((r) => refText(r, c, units)).join(" / ") : "—"}
                      {c.context?.length ? ` · range ${c.context.map((r) => refText(r, c, units)).join(" / ")}` : ""}
                    </p>
                    <p className="text-xs">{t.prelim[c.outcome]}</p>
                    {c.notes.map((n) => (
                      <p key={n} className="text-xs text-slate">
                        {t.prelim[n] ?? n}
                      </p>
                    ))}
                    {c.outcome === "missing" && onAsk && (
                      <button className="text-xs font-medium text-navy underline" onClick={() => onAsk(c.field)}>
                        Answer now
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="mb-1 font-semibold text-navy">{t.card.strictChecks}</h4>
            <p className="mb-2 text-xs text-slate">Only manufacturer-approved requirements can decide this checklist. Until they exist, items stay open.</p>
            <ul className="space-y-2">
              {ev.strict.checks.map((c) => (
                <li key={c.key} className="flex gap-2">
                  <OutcomeIcon outcome={c.outcome} />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t.checks[c.key]} <span className="font-normal text-slate">— {t.checkOutcome[c.outcome]}</span>
                    </p>
                    <p className="text-xs text-slate">{strictReason(c)}</p>
                    {c.remedy && <p className="text-xs text-status-open">{c.remedy}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {ev.missingFields.length > 0 && (
            <section>
              <h4 className="mb-1 font-semibold text-navy">{t.card.missing}</h4>
              <ul className="list-inside list-disc text-xs text-slate">
                {ev.missingFields.map((f) => (
                  <li key={f}>
                    {onAsk ? (
                      <button className="underline" onClick={() => onAsk(f)}>
                        {t.fields[f].question}
                      </button>
                    ) : (
                      t.fields[f].question
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-[11px] text-slate">Rule set: {ev.ruleSetVersions.join(", ") || "—"}</p>
        </div>
      )}
    </article>
  );
}
