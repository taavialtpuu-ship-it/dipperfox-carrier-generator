import { requireAdmin } from "@/lib/admin";
import { EXPORTS, type ExportKind, buildExport } from "@/lib/exports";
import { errorResponse, notFound } from "@/lib/http";
import { log } from "@/lib/log";

type Ctx = { params: Promise<{ kind: string }> };

/** Admin-only CSV download, generated from PostgreSQL. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { kind: raw } = await params;
    const kind = raw.replace(/\.csv$/, "") as ExportKind;
    if (!(kind in EXPORTS)) throw notFound();
    const csv = await buildExport(kind);
    log.info("admin_export", { kind });
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dipperfox-${kind}-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
