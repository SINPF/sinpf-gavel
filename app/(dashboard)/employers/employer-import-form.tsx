"use client";

import { useRef, useState } from "react";
import { X, Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  importEmployers,
  type EmployerImportRow,
  type EmployerImportResult,
} from "@/app/actions/import-employers";

type ParsedRow = EmployerImportRow & { _error?: string };

const REQUIRED_HEADERS = ["name", "code"] as const;
const KNOWN_HEADERS    = ["name", "code", "phone", "email", "address"] as const;
type HeaderKey = (typeof KNOWN_HEADERS)[number];

function normaliseHeader(h: string): HeaderKey | null {
  const k = h.trim().toLowerCase();
  return (KNOWN_HEADERS as readonly string[]).includes(k) ? (k as HeaderKey) : null;
}

function parseFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) return resolve([]);

        const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          blankrows: false,
          defval: "",
          raw: false,
        });

        if (raw.length === 0) return resolve([]);

        const headers = raw[0].map(normaliseHeader);
        const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          return reject(new Error(`Missing required column(s): ${missing.join(", ")}`));
        }

        const rows: ParsedRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const cells = raw[i];
          if (!cells || cells.every((c) => String(c ?? "").trim() === "")) continue;

          const row: ParsedRow = { name: "", code: "" };
          headers.forEach((key, j) => {
            if (!key) return;
            row[key] = String(cells[j] ?? "").trim();
          });

          if (!row.name || !row.code) row._error = "Missing name or code";
          else if ((row.code ?? "").length > 6) row._error = "Code exceeds 6 characters";

          rows.push(row);
        }
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse file"));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function EmployerImportForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file,      setFile]      = useState<File | null>(null);
  const [rows,      setRows]      = useState<ParsedRow[]>([]);
  const [parseErr,  setParseErr]  = useState<string | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState<EmployerImportResult | null>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setRows([]);
    setParseErr(null);
    setResult(null);
    try {
      const parsed = await parseFile(f);
      setRows(parsed);
      if (parsed.length === 0) setParseErr("No data rows found in file.");
    } catch (err) {
      setParseErr(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => !r._error);
    if (valid.length === 0) return;
    setImporting(true);
    try {
      const res = await importEmployers(
        valid.map((r) => ({
          name:    r.name,
          code:    r.code,
          phone:   r.phone,
          email:   r.email,
          address: r.address,
        })),
      );
      setResult(res);
      router.refresh();
    } catch {
      setParseErr("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setRows([]);
    setParseErr(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const validCount   = rows.filter((r) => !r._error).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="w-full max-w-4xl max-h-[85vh] bg-card rounded-md border border-border shadow-lg overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border bg-muted/30">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground tracking-tight">
            Import employers
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Upload a CSV or Excel file with columns: <span className="font-semibold text-foreground">name, code, phone, email, address</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-linear-to-br from-background via-blue-50 to-blue-100">
        <div className="p-6 space-y-5">
          {/* File picker */}
          {!result && (
            <label
              htmlFor="import-file"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex items-center gap-4 p-5 rounded-md border-2 border-dashed cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <div className="shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                {file ? <FileSpreadsheet className="w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                {file ? (
                  <>
                    <div className="text-sm font-semibold text-foreground truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB · Click to choose a different file
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-foreground">
                      Choose a file or drag it here
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Accepts .csv, .xls, .xlsx
                    </div>
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                id="import-file"
                type="file"
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>
          )}

          {parseErr && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{parseErr}</span>
            </div>
          )}

          {/* Preview */}
          {!result && rows.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Preview ({rows.length} {rows.length === 1 ? "row" : "rows"})
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 font-medium tabular-nums">
                    {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-destructive font-medium tabular-nums">
                      {invalidCount} invalid
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-border bg-card overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="sticky top-0 z-10 bg-muted-foreground/15">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Code</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-b border-border last:border-b-0 ${
                            r._error ? "bg-destructive/5" : "bg-card"
                          }`}
                          title={r._error ?? undefined}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 text-foreground font-medium">{r.name || <em className="text-destructive font-normal">—</em>}</td>
                          <td className="px-3 py-2 text-foreground">{r.code || <em className="text-destructive font-normal">—</em>}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.phone || <span className="italic text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.email || <span className="italic text-muted-foreground/40">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-45">{r.address || <span className="italic text-muted-foreground/40">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {invalidCount > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Invalid rows will be skipped. Only rows with a name and a code (max 6 chars) will be imported.
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-700" />
                <div>
                  <div className="text-sm font-semibold text-emerald-900">
                    Imported {result.inserted} {result.inserted === 1 ? "employer" : "employers"}
                  </div>
                  {result.skipped.length > 0 && (
                    <div className="text-xs text-emerald-800 mt-0.5">
                      {result.skipped.length} {result.skipped.length === 1 ? "row was" : "rows were"} skipped — see details below.
                    </div>
                  )}
                </div>
              </div>

              {result.skipped.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Skipped rows</h3>
                  <div className="rounded-md border border-border bg-card overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-xs tabular-nums">
                        <thead className="sticky top-0 z-10 bg-muted-foreground/15">
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Code</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.skipped.map((s, i) => (
                            <tr key={i} className="border-b border-border last:border-b-0 bg-destructive/5">
                              <td className="px-3 py-2 text-foreground font-medium">{s.row.name || <em className="text-muted-foreground/60 font-normal">—</em>}</td>
                              <td className="px-3 py-2 text-foreground">{s.row.code || <em className="text-muted-foreground/60 font-normal">—</em>}</td>
                              <td className="px-3 py-2 text-destructive font-medium">{s.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
        {result ? (
          <>
            <button
              type="button"
              onClick={resetAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
            >
              Import another file
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {rows.length > 0
                ? `Ready to import ${validCount} of ${rows.length} rows.`
                : "Choose a file to begin."}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  importing || validCount === 0
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
                }`}
              >
                {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {importing ? "Importing…" : `Import ${validCount || ""}`.trim()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
