"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiClientError, endpoints, utmFromLocation } from "@/lib/client/api";
import { type FieldKey, type MachineProfile } from "@/lib/domain";
import type { AssessmentDTO } from "@/lib/dto";
import { nextStep } from "@/lib/guide";
import { t } from "@/lib/i18n/en";
import type { UnitSystem } from "@/lib/units";
import { HistoryDrawer } from "./history-drawer";
import { FieldInput, type SpecAction } from "./machine/field-input";
import { IdentityForm } from "./machine/identity-form";
import { SpecList } from "./machine/spec-list";
import { Comparison } from "./product/comparison";
import { ResearchPanel } from "./research/research-panel";
import { AskBox } from "./research/ask-box";
import { EnquirySection } from "./enquiry/enquiry-section";
import { TopBar } from "./top-bar";
import { Button, Card, ErrorNote, Explain, Spinner } from "./ui";

function toProfile(a: AssessmentDTO): MachineProfile {
  const specs: MachineProfile["specs"] = {};
  for (const s of a.specs) specs[s.field] = { ...s, sourceUrl: s.source?.url ?? null };
  return { carrierType: a.carrierType as MachineProfile["carrierType"], manufacturer: a.manufacturer, model: a.model, year: a.year, identityConfirmed: a.identityConfirmed, specs };
}

/** Landing: the opening question. */
export function Landing() {
  const router = useRouter();
  const qc = useQueryClient();
  const [units, setUnits] = useState<UnitSystem>("metric");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [text, setText] = useState("");
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: endpoints.catalog });
  const start = useMutation({
    mutationFn: async (description: string | null) => {
      let a = await endpoints.create({ utm: utmFromLocation() });
      if (units !== "metric") a = await endpoints.patch(a.id, { unitSystem: units });
      if (description) a = await endpoints.describe(a.id, description);
      return a;
    },
    onSuccess: (a) => {
      qc.setQueryData(["assessment", a.id], a);
      qc.invalidateQueries({ queryKey: ["assessments"] });
      router.push(`/assessment/${a.id}`);
    },
  });
  return (
    <>
      <TopBar units={units} onUnits={setUnits} onHistory={() => setHistoryOpen(true)} onNew={() => setText("")} appEnv={catalog.data?.appEnv} />
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <main className="flex-1">
        <section className="bg-navy-deep text-white">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-orange">{t.app.tagline}</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{t.landing.question}</h1>
            <form
              className="mt-8 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim().length >= 2) start.mutate(text.trim());
              }}
            >
              <label htmlFor="machine" className="sr-only">
                {t.landing.question}
              </label>
              <textarea
                id="machine"
                rows={3}
                maxLength={500}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.landing.placeholder}
                className="w-full resize-none rounded-xl border-0 bg-white px-4 py-3 text-base text-ink shadow-lg outline-none placeholder:text-slate/60 focus:ring-4 focus:ring-orange/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (text.trim().length >= 2) start.mutate(text.trim());
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" variant="primary" busy={start.isPending} disabled={text.trim().length < 2}>
                  {t.landing.submit} <ArrowRight className="size-4" aria-hidden />
                </Button>
                <button type="button" className="text-sm text-white/80 underline-offset-2 hover:underline" onClick={() => start.mutate(null)} disabled={start.isPending}>
                  {t.landing.manual}
                </button>
              </div>
              <p className="text-xs text-navy-mist">{t.landing.privacyHint}</p>
              {start.error && <ErrorNote message={(start.error as Error).message} />}
            </form>
          </div>
        </section>
        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-10 sm:grid-cols-3">
          {catalog.data?.products.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imagePath} alt="" className="size-16 rounded-lg bg-ice object-contain p-1" />
              <div>
                <p className="font-semibold text-navy">Dipperfox {p.name}</p>
                <p className="text-xs text-slate">{p.suitability}</p>
              </div>
            </Card>
          ))}
          {catalog.isError && (
            <div className="sm:col-span-3">
              <ErrorNote message={t.errors.database} onRetry={() => catalog.refetch()} />
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/** Active assessment: two-panel workspace. */
export function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"machine" | "compare">("machine");
  const [skipped, setSkipped] = useState<FieldKey[]>([]);
  const [focusField, setFocusField] = useState<FieldKey | null>(null);
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: endpoints.catalog });
  const q = useQuery({ queryKey: ["assessment", id], queryFn: () => endpoints.get(id) });
  const a = q.data;
  const units: UnitSystem = a?.unitSystem ?? "metric";

  const setData = useCallback((dto: AssessmentDTO) => qc.setQueryData(["assessment", id], dto), [qc, id]);
  const patch = useMutation({ mutationFn: (body: Record<string, unknown>) => endpoints.patch(id, body), onSuccess: setData });
  const spec = useMutation({
    mutationFn: (body: SpecAction | { action: "confirm_candidate"; candidateId: string }) => endpoints.spec(id, body),
    onSuccess: (dto) => {
      setData(dto);
      setFocusField(null);
    },
  });

  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const top = (
    <>
      <TopBar
        units={units}
        onUnits={(u) => a && u !== units && patch.mutate({ unitSystem: u })}
        onHistory={() => setHistoryOpen(true)}
        onNew={() => router.push("/")}
        appEnv={catalog.data?.appEnv}
      />
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} currentId={id} />
    </>
  );

  if (q.isLoading || catalog.isLoading)
    return (
      <>
        {top}
        <main className="flex flex-1 items-center justify-center p-10">
          <Spinner label="Loading your assessment…" />
        </main>
      </>
    );

  if (q.error || !a || !catalog.data) {
    const err = q.error as ApiClientError | null;
    const msg = err?.status === 404 || err?.status === 401 ? t.errors.notFound : err?.code === "database_unavailable" ? t.errors.database : (err?.message ?? t.errors.generic);
    return (
      <>
        {top}
        <main className="mx-auto max-w-lg flex-1 space-y-4 p-10">
          <ErrorNote message={msg} onRetry={err?.status === 404 ? undefined : () => { q.refetch(); catalog.refetch(); }} retryLabel={t.errors.retry} />
          <Link href="/" className="text-sm font-medium text-navy underline">
            {t.errors.backHome}
          </Link>
        </main>
      </>
    );
  }

  const profile = toProfile(a);
  const step = focusField ? ({ kind: "field", field: focusField, answered: 0, total: 0 } as const) : nextStep(profile, skipped);
  const specMap = new Map(a.specs.map((s) => [s.field, s]));
  const mutationError = (patch.error || spec.error) as Error | null;

  const onAsk = (f: string) => {
    setFocusField(f as FieldKey);
    setMobileTab("machine");
    if (typeof window !== "undefined") document.getElementById("next-question")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {top}
      {!online && <div className="bg-status-open-bg px-4 py-2 text-center text-sm text-status-open">{t.errors.offline}</div>}
      <div className="sticky top-[52px] z-20 flex border-b border-line bg-white lg:hidden" role="tablist" aria-label="Sections">
        {(["machine", "compare"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={mobileTab === k} onClick={() => setMobileTab(k)} className={clsx("flex-1 border-b-2 py-2.5 text-sm font-medium", mobileTab === k ? "border-orange text-navy" : "border-transparent text-slate")}>
            {k === "machine" ? "Your machine" : `Comparison${a.evaluation.bestCandidate ? " ★" : ""}`}
          </button>
        ))}
      </div>
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] sm:px-6">
        <section aria-label="Your machine" className={clsx("space-y-4", mobileTab !== "machine" && "hidden lg:block")}>
          {a.initialInput && (
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-4 py-2 text-sm text-white">{a.initialInput}</p>
            </div>
          )}
          <IdentityForm key={`${a.carrierType}-${a.manufacturer}-${a.model}-${a.identityConfirmed}`} a={a} onSave={(b) => patch.mutate(b)} busy={patch.isPending} error={patch.error ? (patch.error as Error).message : null} />

          {a.identityConfirmed && <ResearchPanel a={a} units={units} onData={setData} onConfirm={(candidateId) => spec.mutate({ action: "confirm_candidate", candidateId })} busy={spec.isPending} />}

          {a.identityConfirmed && step.kind === "field" && (
            <Card id="next-question" className="border-navy/30 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange">{t.spec.nextQuestion}</p>
              <h3 className="mt-1 font-semibold text-navy">{t.fields[step.field].question}</h3>
              <div className="mt-1">
                <Explain label={t.spec.explain} text={t.fields[step.field].help} />
              </div>
              <div className="mt-3">
                <FieldInput key={step.field} field={step.field} spec={specMap.get(step.field)} units={units} busy={spec.isPending} onAction={(x) => spec.mutate(x)} />
              </div>
              <button
                className="mt-3 text-xs text-slate underline-offset-2 hover:underline"
                onClick={() => {
                  setSkipped((s) => [...s, step.field]);
                  setFocusField(null);
                }}
              >
                {t.spec.skip}
              </button>
            </Card>
          )}
          {a.identityConfirmed && step.kind === "done" && <p className="rounded-lg bg-ice px-4 py-3 text-sm text-slate">{t.spec.allAnswered}</p>}
          {mutationError && <ErrorNote message={mutationError.message} />}
          {spec.isPending && <Spinner label="Recalculating…" />}

          {a.identityConfirmed && (
            <Card className="p-4">
              <h3 className="font-semibold text-navy">{t.spec.allFields}</h3>
              <SpecList a={a} units={units} busyField={spec.isPending ? (spec.variables && "field" in spec.variables ? spec.variables.field : null) : null} onAction={(x) => spec.mutate(x)} />
            </Card>
          )}
          {a.identityConfirmed && <AskBox a={a} onData={setData} />}
        </section>

        <section aria-label="Comparison" className={clsx(mobileTab !== "compare" && "hidden lg:block")}>
          <div>
            <Comparison a={a} catalog={catalog.data} units={units} onAsk={onAsk} footer={<EnquirySection a={a} units={units} onData={setData} />} />
          </div>
        </section>
      </main>
      {patch.isPending && (
        <span className="sr-only" role="status">
          <Loader2 /> Saving
        </span>
      )}
    </>
  );
}
