"use client";

import { useState } from "react";
import { format } from "date-fns";
import { DateField } from "@/components/ui/DateField";
import { Download, Play } from "lucide-react";

type Column = { key: string; header: string; number?: boolean };
type Report = { id: string; label: string };

const inputCls =
  "px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors";

function fmtCell(v: unknown, col: Column): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (col.number) {
    const n = Number(v);
    return isFinite(n) ? n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
  }
  if (col.key === "shareOfTotal" || col.key === "recoveryRate") {
    const n = Number(v);
    return isFinite(n) ? (n * 100).toFixed(1) + "%" : String(v);
  }
  return String(v);
}

export default function ReportsClient({ reports }: { reports: Report[] }) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [id, setId] = useState<string>(reports[0].id);
  const [start, setStart] = useState(format(firstOfMonth, "yyyy-MM-dd"));
  const [end, setEnd] = useState(format(today, "yyyy-MM-dd"));
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/reports?id=${id}&start=${start}&end=${end}`);
      if (!r.ok) throw new Error(await r.text());
      const json = await r.json();
      setColumns(json.columns);
      setRows(json.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    window.location.href = `/api/reports?id=${id}&start=${start}&end=${end}&format=xlsx`;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Report</label>
          <select value={id} onChange={(e) => setId(e.target.value)} className={inputCls}>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <DateField value={start} onChange={setStart} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <DateField value={end} onChange={setEnd} />
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? "Running…" : "Run report"}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> XLSX
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {rows && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No rows for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      {columns.map((c) => (
                        <td key={c.key} className="px-3 py-2 text-foreground tabular-nums">
                          {fmtCell(r[c.key], c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
