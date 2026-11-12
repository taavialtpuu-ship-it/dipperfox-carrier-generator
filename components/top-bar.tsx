"use client";
import Image from "next/image";
import Link from "next/link";
import { History, Plus, ShieldCheck } from "lucide-react";
import { t } from "@/lib/i18n/en";
import type { UnitSystem } from "@/lib/units";
import clsx from "clsx";

export function TopBar({
  units,
  onUnits,
  onHistory,
  onNew,
  appEnv,
}: {
  units: UnitSystem;
  onUnits: (u: UnitSystem) => void;
  onHistory: () => void;
  onNew: () => void;
  appEnv?: string;
}) {
  return (
    <header className="sticky top-0 z-30">
      {appEnv && appEnv !== "production" && (
        <div className="bg-orange px-4 py-1 text-center text-xs font-medium text-white">{t.app.testBanner}</div>
      )}
      <div className="flex items-center gap-3 bg-navy px-4 py-2.5 text-white sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Dipperfox Carrier Generator home">
          <Image src="/brand/dipperfox-logo.svg" alt="Dipperfox" width={88} height={34} priority />
          <span className="hidden border-l border-white/20 pl-3 text-sm font-medium text-white/90 sm:inline">{t.app.title}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <div role="radiogroup" aria-label="Units" className="flex rounded-lg bg-white/10 p-0.5 text-xs">
            {(["metric", "us"] as const).map((u) => (
              <button
                key={u}
                role="radio"
                aria-checked={units === u}
                onClick={() => onUnits(u)}
                className={clsx("rounded-md px-2.5 py-1 font-medium", units === u ? "bg-white text-navy" : "text-white/80 hover:text-white")}
              >
                {t.app.units[u]}
              </button>
            ))}
          </div>
          <button onClick={onHistory} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/90 hover:bg-white/10" aria-label={t.app.history}>
            <History className="size-4" aria-hidden />
            <span className="hidden md:inline">{t.app.history}</span>
          </button>
          <Link href="/privacy" className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/90 hover:bg-white/10 md:flex">
            <ShieldCheck className="size-4" aria-hidden />
            {t.app.privacy}
          </Link>
          <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600">
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t.app.newAssessment}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
