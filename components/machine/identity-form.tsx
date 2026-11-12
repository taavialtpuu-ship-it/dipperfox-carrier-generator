"use client";
import clsx from "clsx";
import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { CARRIER_TYPES, type CarrierType } from "@/lib/domain";
import type { AssessmentDTO } from "@/lib/dto";
import { t } from "@/lib/i18n/en";
import { Button, Card, ErrorNote } from "../ui";

/**
 * Machine identity. Three modes, so the visitor is never asked twice:
 *  - confirmed: compact summary with "Change machine";
 *  - understood from the description: one-click confirm, inputs only for what is missing;
 *  - nothing understood (or editing): the full form.
 */
export function IdentityForm({
  a,
  onSave,
  busy,
  error,
}: {
  a: AssessmentDTO;
  onSave: (body: Record<string, unknown>) => void;
  busy: boolean;
  error?: string | null;
}) {
  const detected = !!(a.carrierType || a.manufacturer || a.model);
  const [mode, setMode] = useState<"auto" | "full">("auto");
  const [carrierType, setCarrierType] = useState<CarrierType | "">((a.carrierType as CarrierType) ?? "");
  const [manufacturer, setManufacturer] = useState(a.manufacturer ?? "");
  const [model, setModel] = useState(a.model ?? "");
  const [year, setYear] = useState(a.year ? String(a.year) : "");

  if (a.identityConfirmed && mode === "auto") {
    return (
      <Card className="flex items-center gap-3 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-status-pass-bg text-status-pass">
          <Check className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-slate">{t.identity.title}</p>
          <p className="truncate font-semibold text-navy">
            {a.manufacturer} {a.model} {a.year ? `(${a.year})` : ""}
          </p>
          <p className="text-xs text-slate">{a.carrierType ? t.carrierTypes[a.carrierType as CarrierType] : ""}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setMode("full")}>
          <Pencil className="size-3.5" aria-hidden /> {t.identity.edit}
        </Button>
      </Card>
    );
  }

  const yearNum = year.trim() ? Number(year) : null;
  const body = () => ({
    carrierType: carrierType || null,
    manufacturer: manufacturer.trim() || null,
    model: model.trim() || null,
    year: yearNum && Number.isInteger(yearNum) ? yearNum : null,
    identityConfirmed: true,
  });
  const complete = !!(carrierType && manufacturer.trim() && model.trim());

  const typeChips = (
    <div role="radiogroup" aria-label={t.identity.carrierType} className="flex flex-wrap gap-2">
      {CARRIER_TYPES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={carrierType === c}
          onClick={() => setCarrierType(c)}
          className={clsx("rounded-lg border px-3 py-1.5 text-sm", carrierType === c ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-navy/40")}
        >
          {t.carrierTypes[c]}
        </button>
      ))}
    </div>
  );

  // Understood from the description: confirm in one click, ask only for what is missing.
  if (detected && mode === "auto" && !a.identityConfirmed) {
    return (
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold text-navy">Is this your machine?</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {a.manufacturer && (
            <>
              <dt className="text-slate">{t.identity.manufacturer}</dt>
              <dd className="font-medium">{a.manufacturer}</dd>
            </>
          )}
          {a.model && (
            <>
              <dt className="text-slate">{t.identity.model}</dt>
              <dd className="font-medium">{a.model}</dd>
            </>
          )}
          {a.year && (
            <>
              <dt className="text-slate">Year</dt>
              <dd className="font-medium">{a.year}</dd>
            </>
          )}
          {a.carrierType && (
            <>
              <dt className="text-slate">{t.identity.carrierType}</dt>
              <dd className="font-medium">{t.carrierTypes[a.carrierType as CarrierType]}</dd>
            </>
          )}
        </dl>
        {!a.carrierType && (
          <div className="space-y-2">
            <p className="text-sm font-medium">What type of machine is it?</p>
            {typeChips}
          </div>
        )}
        {(!a.manufacturer || !a.model) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!a.manufacturer && (
              <div>
                <label htmlFor="manufacturer" className="mb-1 block text-sm font-medium">
                  {t.identity.manufacturer}
                </label>
                <input id="manufacturer" maxLength={80} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm" autoComplete="off" />
              </div>
            )}
            {!a.model && (
              <div>
                <label htmlFor="model" className="mb-1 block text-sm font-medium">
                  {t.identity.model}
                </label>
                <input id="model" maxLength={80} value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm" autoComplete="off" />
              </div>
            )}
          </div>
        )}
        {error && <ErrorNote message={error} />}
        <div className="flex flex-wrap gap-2">
          <Button variant="navy" busy={busy} disabled={!complete} onClick={() => onSave(body())}>
            <Check className="size-4" aria-hidden /> {complete && a.carrierType && a.manufacturer && a.model ? "Yes, that’s my machine" : "Continue"}
          </Button>
          <Button variant="ghost" onClick={() => setMode("full")}>
            <Pencil className="size-3.5" aria-hidden /> Edit details
          </Button>
        </div>
      </Card>
    );
  }

  // Full form (nothing understood yet, or the visitor chose to edit).
  return (
    <Card className="p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(body());
          setMode("auto");
        }}
        className="space-y-3"
      >
        <h2 className="font-semibold text-navy">{t.identity.title}</h2>
        <div>
          <label htmlFor="carrierType" className="mb-1 block text-sm font-medium">
            {t.identity.carrierType}
          </label>
          <select id="carrierType" required value={carrierType} onChange={(e) => setCarrierType(e.target.value as CarrierType)} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
            <option value="">{t.identity.choose}</option>
            {CARRIER_TYPES.map((c) => (
              <option key={c} value={c}>
                {t.carrierTypes[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="manufacturer" className="mb-1 block text-sm font-medium">
              {t.identity.manufacturer}
            </label>
            <input id="manufacturer" required maxLength={80} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="model" className="mb-1 block text-sm font-medium">
              {t.identity.model}
            </label>
            <input id="model" required maxLength={80} value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm" autoComplete="off" />
          </div>
        </div>
        <div>
          <label htmlFor="year" className="mb-1 block text-sm font-medium">
            {t.identity.year}
          </label>
          <input id="year" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} className="w-32 rounded-lg border border-line px-3 py-2 text-sm" />
        </div>
        {error && <ErrorNote message={error} />}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="navy" busy={busy}>
            <Check className="size-4" aria-hidden /> {t.identity.confirm}
          </Button>
          {(a.identityConfirmed || detected) && (
            <Button type="button" variant="ghost" onClick={() => setMode("auto")}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
