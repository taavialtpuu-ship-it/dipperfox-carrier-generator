"use client";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { AssessmentDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import type { UnitSystem } from "@/lib/units";
import { Button, Card, ErrorNote } from "../ui";

type EnquiryType = "quote" | "technical_verification" | "question";

const TITLES: Record<EnquiryType, string> = {
  quote: "Request a Quote",
  technical_verification: "Request Technical Verification",
  question: "Ask Dipperfox a technical question",
};

/** Optional enquiry. Results are always visible without giving contact details. */
export function EnquirySection({ a }: { a: AssessmentDTO; units: UnitSystem; onData: (a: AssessmentDTO) => void }) {
  const [open, setOpen] = useState<EnquiryType | null>(null);
  const [done, setDone] = useState(false);
  const ev = a.evaluation;
  const supported = ev.products.some((p) => p.preliminary.status === "within_range" || p.strict.status === "compatible" || p.strict.status === "conditional");
  const allIncompatible = ev.allIncompatible;

  const openForm = (type: EnquiryType) => {
    setOpen(type);
    endpoints.event({ name: "lead_form_opened", assessmentId: a.id });
  };

  if (done)
    return (
      <Card className="flex gap-3 p-4" role="status">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-pass" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-navy">Your enquiry and assessment have been saved.</p>
          <p className="text-slate">The Dipperfox team will review it and contact you by email.</p>
        </div>
      </Card>
    );

  return (
    <Card className="space-y-3 p-4">
      {allIncompatible ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-navy">None of the Dipperfox models is suitable for this machine.</p>
          <p className="text-slate">Based on the verified checks, a different carrier machine would be needed. You can still ask Dipperfox a technical question.</p>
        </div>
      ) : (
        <p className="text-sm text-slate">
          {supported
            ? "Want to go further? Ask for a quote, or have Dipperfox verify the technical details first."
            : "Some details are still open. Dipperfox can verify your machine’s configuration with you."}
        </p>
      )}
      {!open && (
        <div className="flex flex-wrap gap-2">
          {allIncompatible ? (
            <Button variant="secondary" onClick={() => openForm("question")}>
              <Mail className="size-4" aria-hidden /> {TITLES.question}
            </Button>
          ) : supported ? (
            <>
              <Button variant="primary" onClick={() => openForm("quote")}>
                {TITLES.quote}
              </Button>
              <Button variant="secondary" onClick={() => openForm("technical_verification")}>
                {TITLES.technical_verification}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => openForm("technical_verification")}>
              {TITLES.technical_verification}
            </Button>
          )}
        </div>
      )}
      {open && <LeadForm a={a} type={open} onCancel={() => setOpen(null)} onDone={() => setDone(true)} />}
    </Card>
  );
}

function LeadForm({ a, type, onCancel, onDone }: { a: AssessmentDTO; type: EnquiryType; onCancel: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: "", email: "", country: "", company: "", phone: "", message: "", website: "" });
  const [privacy, setPrivacy] = useState(false);
  const submit = useMutation({
    mutationFn: () => endpoints.lead({ assessmentId: a.id, enquiryType: type, ...f, privacyAccepted: privacy }),
    onSuccess: onDone,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const input = "w-full rounded-lg border border-line px-3 py-2 text-sm";
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate();
      }}
    >
      <h3 className="font-semibold text-navy">{TITLES[type]}</h3>
      <p className="text-xs text-slate">Your machine details, the comparison of all three models, open questions and sources are attached automatically.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="lf-name" className="mb-1 block text-sm font-medium">
            Name *
          </label>
          <input id="lf-name" required maxLength={120} autoComplete="name" value={f.name} onChange={set("name")} className={input} />
        </div>
        <div>
          <label htmlFor="lf-email" className="mb-1 block text-sm font-medium">
            Email *
          </label>
          <input id="lf-email" type="email" required maxLength={200} autoComplete="email" value={f.email} onChange={set("email")} className={input} />
        </div>
        <div>
          <label htmlFor="lf-country" className="mb-1 block text-sm font-medium">
            Country *
          </label>
          <input id="lf-country" required minLength={2} maxLength={80} autoComplete="country-name" value={f.country} onChange={set("country")} className={input} />
        </div>
        <div>
          <label htmlFor="lf-company" className="mb-1 block text-sm font-medium">
            Company
          </label>
          <input id="lf-company" maxLength={160} autoComplete="organization" value={f.company} onChange={set("company")} className={input} />
        </div>
        <div>
          <label htmlFor="lf-phone" className="mb-1 block text-sm font-medium">
            Phone
          </label>
          <input id="lf-phone" type="tel" maxLength={40} autoComplete="tel" value={f.phone} onChange={set("phone")} className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="lf-message" className="mb-1 block text-sm font-medium">
          Message
        </label>
        <textarea id="lf-message" rows={3} maxLength={2000} value={f.message} onChange={set("message")} className={input} />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="lf-website">Website</label>
        <input id="lf-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      <label className="flex items-start gap-2 text-xs text-slate">
        <input type="checkbox" required checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5" />
        <span>
          I agree that Dipperfox stores my contact details and this assessment to answer my enquiry. See the{" "}
          <Link href="/privacy" target="_blank" className="text-navy underline">
            privacy notice
          </Link>
          .
        </span>
      </label>
      {submit.error && <ErrorNote message={(submit.error as Error).message} onRetry={() => submit.mutate()} />}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" busy={submit.isPending}>
          Send enquiry
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
