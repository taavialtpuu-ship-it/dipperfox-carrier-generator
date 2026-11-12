import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { EXPORTS } from "@/lib/exports";
import { AdminLogin, AdminLogout, ReResearchButton } from "./admin-client";
import { SimpleHeader } from "@/components/simple-header";

export const metadata = { title: "Admin — Dipperfox Carrier Generator", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Snap = { results?: { productId: string; preliminaryLabel: string }[]; bestCandidate?: string | null };

export default async function AdminPage() {
  return (
    <>
      <SimpleHeader />
      {await AdminContent()}
    </>
  );
}

async function AdminContent() {
  if (!adminConfigured())
    return (
      <main className="mx-auto max-w-lg flex-1 p-10 text-sm">
        <h1 className="text-xl font-bold text-navy">Admin</h1>
        <p className="mt-3 text-slate">Admin access is not configured. Set ADMIN_PASSWORD (12+ characters) and SESSION_SECRET (32+ characters) on the Railway service.</p>
      </main>
    );
  if (!(await isAdmin()))
    return (
      <main className="mx-auto max-w-sm flex-1 p-10">
        <h1 className="mb-4 text-xl font-bold text-navy">Admin login</h1>
        <AdminLogin />
      </main>
    );

  const [leads, counts, machines] = await Promise.all([
    db().leadEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { assessment: { select: { manufacturer: true, model: true, carrierType: true } } } }),
    Promise.all([db().assessment.count(), db().leadEnquiry.count(), db().machineResearch.count({ where: { status: "completed" } })]),
    db().machineResearch.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { _count: { select: { candidates: true, assessments: true } } } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Enquiries</h1>
          <p className="text-slate">
            Environment: {env.appEnv} · {counts[0]} assessments · {counts[1]} enquiries · {counts[2]} machines researched
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="text-navy underline">
            Open app
          </Link>
          <AdminLogout />
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-semibold text-navy">CSV exports</h2>
        <ul className="flex flex-wrap gap-2">
          {Object.entries(EXPORTS).map(([k, v]) => (
            <li key={k}>
              <a href={`/api/admin/export/${k}.csv`} className={`inline-block rounded-lg border px-3 py-1.5 ${v.pii ? "border-status-fail/30 text-status-fail" : "border-line text-navy"} hover:bg-white`}>
                {v.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate">The enquiries file contains personal data — store and share it accordingly. All other exports are pseudonymous.</p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-navy">Latest enquiries ({leads.length})</h2>
        {leads.length === 0 ? (
          <p className="text-slate">No enquiries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-slate">
                <tr>
                  <th className="p-2">Received</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Contact</th>
                  <th className="p-2">Machine</th>
                  <th className="p-2">Preliminary outcome</th>
                  <th className="p-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const snap = l.snapshot as Snap;
                  return (
                    <tr key={l.id} className="border-t border-line align-top">
                      <td className="p-2 whitespace-nowrap">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                      <td className="p-2">{l.enquiryType.replace(/_/g, " ")}</td>
                      <td className="p-2">
                        <span className="block font-medium">{l.name}</span>
                        <a href={`mailto:${l.email}`} className="text-navy underline">
                          {l.email}
                        </a>
                        <span className="block text-slate">
                          {[l.company, l.country, l.phone].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td className="p-2">
                        {l.assessment ? `${l.assessment.manufacturer ?? ""} ${l.assessment.model ?? ""}` : "—"}
                        <span className="block text-slate">{l.assessment?.carrierType?.replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-2">
                        {snap.results?.map((r) => (
                          <span key={r.productId} className="block">
                            {r.productId}: {r.preliminaryLabel}
                          </span>
                        ))}
                        {snap.bestCandidate && <span className="block font-medium text-navy">Best: {snap.bestCandidate}</span>}
                      </td>
                      <td className="max-w-xs p-2 whitespace-pre-line">{l.message ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-navy">Researched machines (cache)</h2>
        {machines.length === 0 ? (
          <p className="text-slate">No machines researched yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-slate">
                <tr>
                  <th className="p-2">Machine</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Values found</th>
                  <th className="p-2">Assessments</th>
                  <th className="p-2">Last completed</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="p-2">
                      {m.manufacturer} {m.model} <span className="text-slate">({m.carrierType.replace(/_/g, " ")})</span>
                    </td>
                    <td className="p-2">{m.status}{m.error ? ` — ${m.error}` : ""}</td>
                    <td className="p-2">{m._count.candidates}</td>
                    <td className="p-2">{m._count.assessments}</td>
                    <td className="p-2">{m.completedAt?.toISOString().slice(0, 10) ?? "—"}</td>
                    <td className="p-2">
                      <ReResearchButton researchId={m.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
