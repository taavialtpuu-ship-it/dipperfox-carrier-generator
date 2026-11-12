"use client";
import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { CARRIER_TYPES, type CarrierType } from "@/lib/domain";
import type { AssessmentDTO } from "@/lib/dto";
import { t } from "@/lib/i18n/en";
import { Button, Card, ErrorNote } from "../ui";

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
  const [editing, setEditing] = useState(!a.identityConfirmed);
  const [carrierType, setCarrierType] = useState<CarrierType | "">((a.carrierType as CarrierType) ?? "");
  const [manufacturer, setManufacturer] = useState(a.manufacturer ?? "");
  const [model, setModel] = useState(a.model ?? "");
  const [year, setYear] = useState(a.year ? String(a.year) : "");

  if (a.identityConfirmed && !editing) {
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
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" aria-hidden /> {t.identity.edit}
        </Button>
      </Card>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = year.trim() ? Number(year) : null;
    onSave({
      carrierType: carrierType || null,
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      year: y && Number.isInteger(y) ? y : null,
      identityConfirmed: true,
    });
    setEditing(false);
  };

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-semibold text-navy">{t.identity.title}</h2>
        {a.initialInput && !a.identityConfirmed && (a.manufacturer || a.model || a.carrierType) && <p className="text-xs text-slate">{t.identity.detected}</p>}
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
        <Button type="submit" variant="navy" busy={busy}>
          <Check className="size-4" aria-hidden /> {t.identity.confirm}
        </Button>
      </form>
    </Card>
  );
}
