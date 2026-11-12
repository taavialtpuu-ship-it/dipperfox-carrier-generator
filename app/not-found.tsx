import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg flex-1 space-y-4 p-10 text-center">
      <h1 className="text-xl font-bold text-navy">Page not found</h1>
      <p className="text-sm text-slate">This page does not exist.</p>
      <Link href="/" className="inline-block rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white">
        Start an assessment
      </Link>
    </main>
  );
}
