import Image from "next/image";
import Link from "next/link";

/** Minimal brand header for secondary pages (privacy, admin). */
export function SimpleHeader() {
  return (
    <header className="flex items-center gap-3 bg-navy px-4 py-2.5 text-white sm:px-6">
      <Link href="/" className="flex items-center gap-3" aria-label="Dipperfox Carrier Generator home">
        <Image src="/brand/dipperfox-logo.svg" alt="Dipperfox" width={88} height={34} priority />
        <span className="hidden border-l border-white/20 pl-3 text-sm font-medium text-white/90 sm:inline">Carrier Generator</span>
      </Link>
      <Link href="/" className="ml-auto rounded-lg bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600">
        Start an assessment
      </Link>
    </header>
  );
}
