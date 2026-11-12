"use client";
import clsx from "clsx";
import { useId, useState } from "react";
import { FIELDS, type FieldKey } from "@/lib/domain";
import type { SpecDTO } from "@/lib/dto";
import { t } from "@/lib/i18n/en";
import { UNITS, type UnitSystem, displayUnit } from "@/lib/units";
import { Button } from "../ui";

export type SpecAction =
  | { action: "set_number"; field: FieldKey; value: number; unit: string }
  | { action: "set_choice"; field: FieldKey; value: string }
  | { action: "unknown"; field: FieldKey }
  | { action: "clear"; field: FieldKey };

/** Input control for one machine field. Numbers keep the unit the user typed. */
export function FieldInput({
  field,
  spec,
  units,
  onAction,
  busy,
  compact,
}: {
  field: FieldKey;
  spec?: SpecDTO;
  units: UnitSystem;
  onAction: (a: SpecAction) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const def = FIELDS[field];
  const id = useId();
  const [value, setValue] = useState(spec?.enteredUnit && spec.enteredValue ? spec.enteredValue : "");
  const [unit, setUnit] = useState(spec?.enteredUnit ?? (def.dimension ? displayUnit(def.dimension, units).id : ""));
  const [err, setErr] = useState<string | null>(null);

  if (def.kind === "number" && def.dimension) {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const n = Number(value.replace(/\s/g, "").replace(",", "."));
      if (!value.trim() || !Number.isFinite(n) || n < 0) {
        setErr(t.spec.implausible);
        return;
      }
      setErr(null);
      onAction({ action: "set_number", field, value: n, unit });
    };
    return (
      <form onSubmit={submit} className="space-y-2" aria-describedby={err ? `${id}-err` : undefined}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 rounded-lg border border-line bg-white focus-within:border-navy">
            <label htmlFor={`${id}-v`} className="sr-only">
              {t.fields[field].label}
            </label>
            <input
              id={`${id}-v`}
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t.spec.enterValue}
              className="w-full min-w-0 rounded-l-lg bg-transparent px-3 py-2 text-sm outline-none"
            />
            <label htmlFor={`${id}-u`} className="sr-only">
              Unit
            </label>
            <select id={`${id}-u`} value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-r-lg border-l border-line bg-surface px-2 text-sm">
              {UNITS[def.dimension].map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="navy" size={compact ? "sm" : "md"} busy={busy}>
            {t.spec.save}
          </Button>
          <Button type="button" variant="ghost" size={compact ? "sm" : "md"} disabled={busy} onClick={() => onAction({ action: "unknown", field })}>
            {t.spec.dontKnow}
          </Button>
        </div>
        {err && (
          <p id={`${id}-err`} className="text-xs text-status-fail">
            {err}
          </p>
        )}
      </form>
    );
  }

  const current = spec?.state === "marked_unknown" ? "unknown" : spec?.valueText;
  return (
    <div role="radiogroup" aria-label={t.fields[field].label} className="flex flex-wrap gap-2">
      {def.options?.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={current === o}
          disabled={busy}
          onClick={() => onAction({ action: "set_choice", field, value: o })}
          className={clsx(
            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
            current === o ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy/40",
          )}
        >
          {t.options[o] ?? o}
        </button>
      ))}
      {!def.options?.includes("unknown") && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction({ action: "unknown", field })}
          className={clsx("rounded-lg border px-3 py-1.5 text-sm", current === "unknown" ? "border-navy bg-navy text-white" : "border-dashed border-line text-slate hover:border-navy/40")}
        >
          {t.spec.dontKnow}
        </button>
      )}
    </div>
  );
}
