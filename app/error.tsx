"use client";
import Link from "next/link";

/** Recoverable error screen (e.g. database outage) instead of a blank page. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg flex-1 space-y-4 p-10 text-center">
      <h1 className="text-xl font-bold text-navy">Something went wrong</h1>
      <p className="text-sm text-slate">The service is temporarily unavailable. Your saved assessments are not lost — please try again in a moment.</p>
      <div className="flex justify-center gap-3">
        <button onClick={reset} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm">
          Home
        </Link>
      </div>
    </main>
  );
}
