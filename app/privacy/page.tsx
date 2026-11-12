import Link from "next/link";
import { SimpleHeader } from "@/components/simple-header";

export const metadata = { title: "Privacy — Dipperfox Carrier Generator" };

export default function PrivacyPage() {
  return (
    <>
    <SimpleHeader />
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 text-sm leading-relaxed text-ink">
      <Link href="/" className="text-navy underline">
        ← Back to the Carrier Generator
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-navy">How this tool handles your data</h1>
      <p className="mt-2 rounded-md bg-status-open-bg px-3 py-2 text-status-open">
        Draft for legal review. This notice describes how the tool currently works; it has not yet been reviewed by a lawyer.
      </p>
      <h2 className="mt-6 font-semibold text-navy">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Your machine details and answers, so you can return to your assessment.</li>
        <li>The text you type to describe your machine or ask a question. Obvious email addresses and phone numbers are removed before saving.</li>
        <li>Anonymous usage events (for example: which step was reached, which models were compared). They are linked to a random ID, not to your name. We do not store IP addresses for analytics.</li>
        <li>If you send an enquiry: your name, email, country and the optional details you provide, together with the assessment.</li>
      </ul>
      <h2 className="mt-6 font-semibold text-navy">Cookies</h2>
      <p className="mt-2">
        We use one essential cookie that keeps your assessments available in this browser. There are no advertising or third-party tracking cookies. Another browser or device cannot see your assessments.
      </p>
      <h2 className="mt-6 font-semibold text-navy">Third parties</h2>
      <p className="mt-2">
        To identify machines and research specifications, your machine description and questions are processed by Anthropic (Claude API), which performs web searches. Do not include personal information in these texts. The tool is hosted on Railway (data stored in a PostgreSQL database).
      </p>
      <h2 className="mt-6 font-semibold text-navy">Your choices</h2>
      <p className="mt-2">
        You can delete any assessment from “My assessments”. To ask about or delete an enquiry you sent, contact Dipperfox at{" "}
        <a className="text-navy underline" href="mailto:info@dipperfox.com">
          info@dipperfox.com
        </a>
        .
      </p>
      <h2 className="mt-6 font-semibold text-navy">Important</h2>
      <p className="mt-2">Results are preliminary guidance, not a manufacturer-approved installation sign-off.</p>
    </main>
    </>
  );
}
