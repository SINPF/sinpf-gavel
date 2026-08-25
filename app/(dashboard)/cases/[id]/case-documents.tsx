"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { format, isValid } from "date-fns";
import { uploadCaseDocument } from "@/app/actions/upload-case-document";
import { withdrawDocument } from "@/app/actions/withdraw-document";
import type { CaseAttachment } from "@/db/types";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "ems_referral_letter", label: "EMS referral letter" },
  { value: "contribution_statement", label: "Contribution statement" },
  { value: "compliance_note", label: "Compliance note" },
  { value: "employer_correspondence", label: "Employer correspondence" },
  { value: "legal_notice", label: "Legal notice" },
  { value: "affidavit", label: "Affidavit" },
  { value: "deed_of_settlement", label: "Deed of settlement" },
  { value: "court_document", label: "Court document" },
  { value: "payment_evidence", label: "Payment evidence" },
  { value: "wages_record", label: "Wages record" },
  { value: "other", label: "Other" },
];

const LABEL_BY_VALUE = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

function fmtDateTime(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return isValid(d) ? format(d, "d MMM yyyy · HH:mm") : String(v);
}

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";

export function CaseDocuments({
  caseId,
  documents,
  canUpload,
  canWithdraw,
}: {
  caseId: string;
  documents: CaseAttachment[];
  canUpload: boolean;
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("other");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  function openPicker() {
    setError(null);
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  async function submitUpload() {
    if (selectedFiles.length === 0) {
      openPicker();
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("caseId", caseId);
      formData.append("documentType", docType);
      selectedFiles.forEach((f) => formData.append("files", f));
      await uploadCaseDocument(formData);
      setSelectedFiles([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleWithdraw(id: string) {
    const reason = prompt("Reason for withdrawing this document (10 chars minimum)?");
    if (!reason || reason.trim().length < 10) return;
    try {
      await withdrawDocument({ documentId: id, reason });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  const visible = filter ? documents.filter((d) => d.documentType === filter) : documents;

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">Documents</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-1 rounded-md border border-border bg-background text-xs font-medium text-foreground"
          >
            <option value="">All types</option>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{visible.length} file(s)</span>
        </div>
      </div>

      {canUpload && (
        <div className="mb-4 p-3 rounded-md border border-dashed border-border bg-muted/30 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className={`${inputCls} max-w-xs`}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              ref={fileRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
            >
              Choose files
            </button>
            <button
              type="button"
              onClick={submitUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          {selectedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedFiles.length} file(s) selected: {selectedFiles.map((f) => f.name).join(", ")}
            </p>
          )}
          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents to show.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((d) => (
            <li key={d.id} className="py-3 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{d.fileName}</span>
                  <span className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-semibold uppercase bg-muted text-muted-foreground">
                    {LABEL_BY_VALUE[d.documentType] ?? d.documentType}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {fmtDateTime(d.uploadedAt)}
                </span>
              </span>
              {d.presignedUrl && (
                <a
                  href={d.presignedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              )}
              {canWithdraw && (
                <button
                  onClick={() => handleWithdraw(d.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Withdraw"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Withdraw
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
