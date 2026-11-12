"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { endpoints } from "@/lib/client/api";
import { t } from "@/lib/i18n/en";
import { Button, ErrorNote, Spinner } from "./ui";

export function HistoryDrawer({ open, onClose, currentId }: { open: boolean; onClose: () => void; currentId?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const list = useQuery({ queryKey: ["assessments"], queryFn: endpoints.list, enabled: open });
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => endpoints.patch(id, { title }),
    onSuccess: (dto) => {
      qc.setQueryData(["assessment", dto.id], dto);
      qc.invalidateQueries({ queryKey: ["assessments"] });
      setRenaming(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => endpoints.remove(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["assessment", id] });
      qc.invalidateQueries({ queryKey: ["assessments"] });
      if (id === currentId) router.push("/");
    },
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <button className="absolute inset-0 bg-navy-deep/40" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="history-title" className="text-lg font-semibold text-navy">
            {t.history.title}
          </h2>
          <button ref={closeRef} onClick={onClose} className="rounded-md p-1.5 hover:bg-black/5" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {list.isLoading && <Spinner label="Loading…" />}
          {list.error && <ErrorNote message={(list.error as Error).message} onRetry={() => list.refetch()} />}
          {list.data && list.data.assessments.length === 0 && <p className="text-sm text-slate">{t.history.empty}</p>}
          <ul className="space-y-2">
            {list.data?.assessments.map((a) => (
              <li key={a.id} className={`rounded-lg border p-3 ${a.id === currentId ? "border-navy/40 bg-ice" : "border-line"}`}>
                {renaming === a.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (name.trim()) rename.mutate({ id: a.id, title: name.trim() });
                    }}
                  >
                    <label className="sr-only" htmlFor={`rn-${a.id}`}>
                      {t.history.rename}
                    </label>
                    <input id={`rn-${a.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="flex-1 rounded-md border border-line px-2 py-1 text-sm" autoFocus />
                    <Button size="sm" variant="navy" busy={rename.isPending}>
                      {t.spec.save}
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      className="flex-1 text-left"
                      onClick={() => {
                        onClose();
                        endpoints.event({ name: "assessment_reopened", assessmentId: a.id });
                        router.push(`/assessment/${a.id}`);
                      }}
                    >
                      <span className="block font-medium text-ink">{a.title}</span>
                      <span className="block text-xs text-slate">
                        {[a.manufacturer, a.model].filter(Boolean).join(" ") || "—"} · {new Date(a.updatedAt).toLocaleString()}
                      </span>
                    </button>
                    <button className="rounded p-1 text-slate hover:bg-black/5" aria-label={`${t.history.rename} ${a.title}`} onClick={() => { setRenaming(a.id); setName(a.title); }}>
                      <Pencil className="size-4" />
                    </button>
                    <button
                      className="rounded p-1 text-status-fail hover:bg-status-fail-bg"
                      aria-label={`${t.history.delete} ${a.title}`}
                      onClick={() => window.confirm(t.history.confirmDelete) && remove.mutate(a.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {(rename.error || remove.error) && <div className="mt-3"><ErrorNote message={((rename.error || remove.error) as Error).message} /></div>}
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-slate">{t.history.browserNote}</p>
      </div>
    </div>
  );
}
