"use client";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CarrierType } from "@/lib/domain";
import type { AssessmentDTO, CatalogDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import { CORE_FIELDS } from "@/lib/guide";
import { t } from "@/lib/i18n/en";
import type { UnitSystem } from "@/lib/units";
import { specValueText } from "../machine/spec-list";
import { ProductCard } from "./product-card";
import { SourcesPanel } from "./sources-panel";

export function Comparison({
  a,
  catalog,
  units,
  onAsk,
  footer,
}: {
  a: AssessmentDTO;
  catalog: CatalogDTO;
  units: UnitSystem;
  onAsk: (field: string) => void;
  footer?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"cards" | "sources">("cards");
  const ev = a.evaluation;
  const specs = new Map(a.specs.map((s) => [s.field, s]));
  const within = ev.products.filter((p) => p.preliminary.status === "within_range").length;
  const viewed = useRef(false);
  useEffect(() => {
    if (!viewed.current && a.identityConfirmed && a.specs.length > 0) {
      viewed.current = true;
      endpoints.event({ name: "compatibility_result_viewed", assessmentId: a.id });
    }
  }, [a.id, a.identityConfirmed, a.specs.length]);

  return (
    <div className="space-y-4">
      <section aria-label="Machine summary" className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-navy">
            {a.manufacturer || a.model ? `${a.manufacturer ?? ""} ${a.model ?? ""}`.trim() : t.identity.title}
            {a.year ? <span className="ml-2 text-sm font-normal text-slate"> {a.year}</span> : null}
          </h2>
          <span className="text-xs text-slate">{a.carrierType ? t.carrierTypes[a.carrierType as CarrierType] : "—"}</span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {CORE_FIELDS.map((f) => (
            <div key={f}>
              <dt className="text-[11px] uppercase tracking-wide text-slate">{t.fields[f].label.replace(/ \(.*\)$/, "").replace(" at the attachment", "")}</dt>
              <dd className="text-sm font-semibold text-ink">{specValueText(specs.get(f), units)}</dd>
            </div>
          ))}
        </dl>
        {a.next.kind === "field" || a.next.kind === "done" ? (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={a.next.total} aria-valuenow={a.next.answered} aria-label="Details answered">
              <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${(a.next.answered / Math.max(1, a.next.total)) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate">{t.spec.progress(a.next.answered, a.next.total)}</p>
          </div>
        ) : null}
      </section>

      <div role="note" className="flex gap-3 rounded-xl border border-status-open/30 bg-status-open-bg p-3 text-sm text-status-open">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">{t.outcomes.banner}</p>
          <p className="text-xs leading-relaxed">{t.outcomes.bannerDetail}</p>
        </div>
      </div>

      <div role="tablist" aria-label="Comparison views" className="flex gap-1 border-b border-line">
        {(["cards", "sources"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={clsx("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === k ? "border-orange text-navy" : "border-transparent text-slate hover:text-navy")}
          >
            {k === "cards" ? "Dipperfox models" : t.sources.title}
          </button>
        ))}
      </div>

      {tab === "cards" ? (
        <div role="tabpanel" className="space-y-4">
          {within > 1 && <p className="text-sm text-slate">{t.outcomes.multipleCandidates}</p>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-3">
            {catalog.products.map((p) => {
              const pe = ev.products.find((x) => x.productId === p.id);
              if (!pe) return null;
              return <ProductCard key={p.id} product={p} ev={pe} units={units} best={ev.bestCandidate === p.id} onAsk={onAsk} awaitingMachine={!a.identityConfirmed || !a.carrierType} />;
            })}
          </div>
          {footer}
        </div>
      ) : (
        <div role="tabpanel">
          <SourcesPanel a={a} catalog={catalog} units={units} />
        </div>
      )}
    </div>
  );
}
