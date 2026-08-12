import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { runReport, REPORTS, type ReportId } from "@/lib/reports";
import { assertCan } from "@/lib/rbac";

// GET /api/reports?id=rpt01&start=YYYY-MM-DD&end=YYYY-MM-DD&format=json|xlsx
export async function GET(req: Request) {
  await assertCan("view_reports");
  const url = new URL(req.url);
  const id = url.searchParams.get("id") as ReportId | null;
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const format = url.searchParams.get("format") ?? "json";

  if (!id || !REPORTS.some((r) => r.id === id)) {
    return NextResponse.json({ error: "Unknown report id" }, { status: 400 });
  }
  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required (YYYY-MM-DD)" }, { status: 400 });
  }

  const result = await runReport(id, { start, end });

  if (format === "xlsx") {
    const rowsForSheet = result.rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of result.columns as readonly { key: string; header: string }[]) {
        const v = (r as Record<string, unknown>)[col.key];
        out[col.header] = Array.isArray(v) ? v.join(", ") : v;
      }
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rowsForSheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, id);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${id}_${start}_${end}.xlsx"`,
      },
    });
  }

  return NextResponse.json(result);
}
