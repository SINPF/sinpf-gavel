"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import { importReferrals, type ImportResult } from "@/app/actions/import-referrals";

const EXPECTED_COLUMNS = [
  "legacyRef",
  "employerCode",
  "referralDate",
  "dateReceived",
  "types",
  "contributionAmount",
  "surchargeAmount",
  "wagesPeriods",
  "periodOfDefaultFrom",
  "periodOfDefaultTo",
  "status",
];

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function ImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(validateOnly: boolean) {
    if (!file) {
      setError("Choose a file to import.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const base64 = await fileToBase64(file);
      const r = await importReferrals({ fileBase64: base64, fileName: file.name, validateOnly });
      setResult(r);
      if (!validateOnly && r.ok) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Expected columns</h2>
        <div className="flex flex-wrap gap-2">
          {EXPECTED_COLUMNS.map((c) => (
            <span
              key={c}
              className="inline-block px-2 py-1 rounded-sm text-[11px] font-semibold tabular-nums bg-muted text-foreground"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>types</strong> is a comma-separated list of{" "}
          <code>unpaid_contribution</code>, <code>unpaid_surcharge</code>,{" "}
          <code>wages_record</code>. <strong>status</strong> defaults to{" "}
          <code>under_assessment</code> per §16. <strong>legacyRef</strong> preserves
          the pre-system reference and is used for duplicate detection.
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-5 space-y-3">
        <label className="flex items-center gap-3">
          <UploadCloud className="w-5 h-5 text-muted-foreground" />
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => run(true)}
            disabled={running || !file}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
          >
            {running ? "Running…" : "Validate (dry run)"}
          </button>
          <button
            onClick={() => run(false)}
            disabled={running || !file}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {running ? "Importing…" : "Commit import"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}
      </div>

      {result && (
        <div className="rounded-md border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            {result.ok ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <AlertCircle className="w-5 h-5 text-warning" />
            )}
            <h2 className="text-sm font-semibold text-foreground">
              {result.imported !== undefined
                ? `Imported ${result.imported} row(s).`
                : result.ok
                ? `Ready to import ${result.toInsert} row(s).`
                : "Fix the errors below then re-validate."}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Scanned {result.scanned} row(s) · {result.errors.length} error(s) ·{" "}
            {result.duplicates.length} duplicate(s).
          </p>
          {result.errors.length > 0 && (
            <div className="max-h-64 overflow-y-auto border border-border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Row</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Column</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 tabular-nums">{e.rowNumber}</td>
                      <td className="px-2 py-1.5 font-medium">{e.column}</td>
                      <td className="px-2 py-1.5 text-destructive">{e.message}</td>
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
