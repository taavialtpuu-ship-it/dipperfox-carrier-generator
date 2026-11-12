"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote } from "@/components/ui";
import { api } from "@/lib/client/api";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api("/api/admin/login", { method: "POST", body: { password: pw } });
          router.refresh();
        } catch (x) {
          setErr((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="pw" className="block text-sm font-medium">
        Password
      </label>
      <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
      {err && <ErrorNote message={err} />}
      <Button type="submit" variant="navy" busy={busy}>
        Log in
      </Button>
    </form>
  );
}

export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      className="text-slate underline"
      onClick={async () => {
        await api("/api/admin/login", { method: "POST", body: { logout: true } }).catch(() => undefined);
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}

export function ReResearchButton({ researchId }: { researchId: string }) {
  const [state, setState] = useState<string | null>(null);
  return (
    <button
      className="text-navy underline disabled:opacity-50"
      disabled={state === "…"}
      onClick={async () => {
        setState("…");
        try {
          const r = await api<{ result: string }>("/api/admin/research", { method: "POST", body: { researchId } });
          setState(r.result.replace(/_/g, " "));
        } catch (x) {
          setState((x as Error).message);
        }
      }}
    >
      {state ?? "Re-research"}
    </button>
  );
}
