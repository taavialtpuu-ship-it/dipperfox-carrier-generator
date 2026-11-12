"use client";
import { ExternalLink } from "lucide-react";
import type { AssessmentDTO, CatalogDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import { t } from "@/lib/i18n/en";
import { type Dimension, formatRange, formatCanonical } from "@/lib/units";
import type { UnitSystem } from "@/lib/units";

const PARAM_DIM: Record<string, Dimension> = {
  carrier_weight_t: "mass_t",
  engine_power_kw_min: "power",
  engine_power_kw_range: "power",
  engine_power_kw: "power",
  aux_flow_lpm: "flow",
  aux_pressure_bar: "pressure",
  tool_mass_kg: "mass_kg",
};
const PARAM_LABEL: Record<string, string> = {
  carrier_weight_t: "Carrier mass",
  engine_power_kw_min: "Minimum engine power",
  engine_power_kw_range: "Engine power range",
  engine_power_kw: "Engine power",
  aux_flow_lpm: "Hydraulic flow",
  aux_pressure_bar: "Operating pressure",
  tool_mass_kg: "Grinder mass",
};

/** Evidence drawer: Dipperfox reference records (with status and conflicts) and machine research sources. */
export function SourcesPanel({ a, catalog, units }: { a: AssessmentDTO | null; catalog: CatalogDTO; units: UnitSystem }) {
  const carrier = a?.carrierType === "long_reach_excavator" ? "excavator" : a?.carrierType;
  const reqs = catalog.requirements.filter((r) => !carrier || r.carrierType === carrier);
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="mb-2 font-semibold text-navy">{t.sources.dipperfox}</h3>
        <p className="mb-3 text-xs text-slate">{t.outcomes.bannerDetail}</p>
        {catalog.products.map((p) => {
          const rows = reqs.filter((r) => r.productId === p.id);
          if (!rows.length) return null;
          return (
            <div key={p.id} className="mb-4">
              <h4 className="mb-1 font-medium">Dipperfox {p.name}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Parameter</th>
                      <th className="py-1 pr-2 font-medium">Carrier</th>
                      <th className="py-1 pr-2 font-medium">Value</th>
                      <th className="py-1 pr-2 font-medium">Status</th>
                      <th className="py-1 font-medium">{t.card.source}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const dim = PARAM_DIM[r.parameter];
                      const v = dim ? (r.value != null ? formatCanonical(r.value, dim, units) : formatRange(r.min, r.max, dim, units)) : (r.value ?? "—");
                      return (
                        <tr key={r.id} className="border-t border-line align-top">
                          <td className="py-1.5 pr-2">{PARAM_LABEL[r.parameter] ?? r.parameter}</td>
                          <td className="py-1.5 pr-2">{t.carrierTypes[r.carrierType as keyof typeof t.carrierTypes] ?? r.carrierType}</td>
                          <td className="py-1.5 pr-2 whitespace-nowrap">{String(v)}</td>
                          <td className="py-1.5 pr-2">
                            <span className={r.status === "conflicting" ? "font-medium text-status-open" : r.status === "approved" ? "text-status-pass" : "text-slate"}>{t.sources.status[r.status] ?? r.status}</span>
                          </td>
                          <td className="py-1.5">
                            {r.sourceUrl ? (
                              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy hover:underline" onClick={() => a && endpoints.event({ name: "source_opened", assessmentId: a.id, url: r.sourceUrl })}>
                                {r.sourceRef} <ExternalLink className="size-3" aria-hidden />
                              </a>
                            ) : (
                              "—"
                            )}
                            {r.checkedAt && <span className="block text-slate">{t.sources.checked} {r.checkedAt.slice(0, 10)}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.some((r) => r.status === "conflicting") && <p className="mt-1 text-xs text-status-open">{t.sources.conflictNote}</p>}
            </div>
          );
        })}
      </section>
      <section>
        <h3 className="mb-2 font-semibold text-navy">{t.sources.machine}</h3>
        {!a?.research?.sources.length && <p className="text-xs text-slate">{t.sources.none}</p>}
        <ul className="space-y-2">
          {a?.research?.sources.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-white p-3">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-navy hover:underline" onClick={() => endpoints.event({ name: "source_opened", assessmentId: a.id, url: s.url! })}>
                  {s.title ?? s.url} <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : (
                <span className="font-medium">{s.title}</span>
              )}
              <p className="text-xs text-slate">
                {s.origin.replace(/_/g, " ")} · {t.sources.retrieved} {s.retrievedAt.slice(0, 10)}
              </p>
              {s.excerpt && <p className="mt-1 border-l-2 border-line pl-2 text-xs italic text-slate">“{s.excerpt}”</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
