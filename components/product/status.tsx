import clsx from "clsx";
import { CheckCircle2, CircleDashed, CircleHelp, CircleMinus, CircleX, Wrench } from "lucide-react";
import type { CheckOutcome, PreliminaryStatus, PrelimOutcome, StrictStatus } from "@/lib/compatibility/types";
import { t } from "@/lib/i18n/en";

/** Preliminary headline badge. Never green or red: these are not verified decisions. */
export function PrelimBadge({ status, size = "md" }: { status: PreliminaryStatus; size?: "sm" | "md" }) {
  const map = {
    within_range: { icon: CheckCircle2, cls: "bg-status-within-bg text-status-within" },
    outside_range: { icon: CircleMinus, cls: "bg-status-outside-bg text-status-outside" },
    cannot_compare: { icon: CircleHelp, cls: "bg-status-open-bg text-status-open" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full font-semibold", map.cls, size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm")}>
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {t.outcomes.preliminary[status]}
    </span>
  );
}

export function StrictBadge({ status, pending }: { status: StrictStatus; pending: boolean }) {
  if (pending)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate">
        <CircleDashed className="size-3.5" aria-hidden /> {t.outcomes.verifiedResult}: {t.outcomes.strictPending}
      </span>
    );
  const map = {
    compatible: { icon: CheckCircle2, cls: "text-status-pass" },
    conditional: { icon: Wrench, cls: "text-status-open" },
    insufficient_data: { icon: CircleHelp, cls: "text-status-open" },
    incompatible: { icon: CircleX, cls: "text-status-fail" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-medium", map.cls)}>
      <Icon className="size-3.5" aria-hidden /> {t.outcomes.verifiedResult}: {t.outcomes.strict[status]}
    </span>
  );
}

export function OutcomeIcon({ outcome }: { outcome: CheckOutcome | PrelimOutcome }) {
  const m: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
    pass: { icon: CheckCircle2, cls: "text-status-pass" },
    within: { icon: CheckCircle2, cls: "text-status-within" },
    within_adjustable: { icon: Wrench, cls: "text-status-within" },
    conditional: { icon: Wrench, cls: "text-status-open" },
    insufficient: { icon: CircleHelp, cls: "text-status-open" },
    missing: { icon: CircleDashed, cls: "text-slate" },
    above_check_adjustable: { icon: CircleHelp, cls: "text-status-open" },
    sources_disagree: { icon: CircleHelp, cls: "text-status-open" },
    no_data: { icon: CircleDashed, cls: "text-slate" },
    fail: { icon: CircleX, cls: "text-status-fail" },
    outside: { icon: CircleMinus, cls: "text-status-outside" },
    not_applicable: { icon: CircleDashed, cls: "text-slate" },
  };
  const x = m[outcome] ?? m.missing;
  const Icon = x.icon;
  return <Icon className={clsx("mt-0.5 size-4 shrink-0", x.cls)} aria-hidden />;
}
