"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  AlertCircle,
  FileText,
  Download,
  Trash2,
  Upload,
  Lock,
  History,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import {
  LEGAL_OPINION_STATE_LABELS,
  type LegalOpinionState,
  isReadyToFinalise,
} from "@/lib/legal-opinion-state";
import { updateLegalOpinion } from "@/app/actions/update-legal-opinion";
import { finaliseLegalOpinion } from "@/app/actions/finalise-legal-opinion";
import {
  uploadLegalOpinionDocument,
  withdrawLegalOpinionDocument,
} from "@/app/actions/upload-legal-opinion-document";

type Opinion = {
  id: string;
  opinionRef: string;
  subjectMatter: string;
  requestingDepartment: string;
  dateRequested: string | null;
  opinionDate: string;
  authorId: string;
  summary: string | null;
  keywords: string[];
  state: string;
  supersedesOpinionId: string | null;
  finalisedAt: Date | null;
  finalisedBy: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  finaliserName: string | null;
};

type Attachment = {
  id: string;
  legalOpinionId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date;
  isWithdrawn: boolean;
  presignedUrl?: string;
};

type Permissions = {
  update: boolean;
  finalise: boolean;
  upload: boolean;
  withdraw: boolean;
  createSuperseding: boolean;
};

const STATE_STYLES: Record<LegalOpinionState, string> = {
  draft: "bg-warning/15 text-warning",
  finalised: "bg-primary text-white",
};

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "signed_opinion", label: "Signed opinion" },
  { value: "draft_opinion", label: "Draft opinion" },
  { value: "supporting_material", label: "Supporting material" },
  { value: "other", label: "Other" },
];
const DOC_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "d MMM yyyy") : v;
}
function fmtDateTime(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return isValid(d) ? format(d, "d MMM yyyy · HH:mm") : String(v);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{children}</p>
    </div>
  );
}

// ─── Edit panel ─────────────────────────────────────────────────────────────

function EditPanel({ opinion, onClose }: { opinion: Opinion; onClose: () => void }) {
  const router = useRouter();
  const [subjectMatter, setSubjectMatter] = useState(opinion.subjectMatter);
  const [requestingDepartment, setRequestingDepartment] = useState(
    opinion.requestingDepartment,
  );
  const [dateRequested, setDateRequested] = useState(opinion.dateRequested ?? "");
  const [opinionDate, setOpinionDate] = useState(opinion.opinionDate);
  const [summary, setSummary] = useState(opinion.summary ?? "");
  const [keywords, setKeywords] = useState<string[]>(opinion.keywords);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function commitKeywordDraft() {
    const parts = keywordDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setKeywords((cur) => Array.from(new Set([...cur, ...parts])));
    setKeywordDraft("");
  }

  async function submit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError("Give a reason for this update (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await updateLegalOpinion({
        id: opinion.id,
        version: opinion.version,
        subjectMatter: subjectMatter.trim(),
        requestingDepartment: requestingDepartment.trim(),
        dateRequested: dateRequested || null,
        opinionDate,
        summary: summary.trim() || null,
        keywords,
        reason: reason.trim(),
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card border border-primary/30 rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">Edit opinion</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className={labelCls}>Subject matter</label>
        <input
          value={subjectMatter}
          onChange={(e) => setSubjectMatter(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Requesting department</label>
          <input
            value={requestingDepartment}
            onChange={(e) => setRequestingDepartment(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Date requested</label>
          <DateField value={dateRequested} onChange={setDateRequested} />
        </div>
        <div>
          <label className={labelCls}>Opinion date</label>
          <DateField value={opinionDate} onChange={setOpinionDate} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={`${inputCls} min-h-20`}
        />
      </div>

      <div>
        <label className={labelCls}>Keywords</label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-semibold bg-muted text-foreground"
            >
              #{k}
              <button
                type="button"
                onClick={() =>
                  setKeywords((cur) => cur.filter((x) => x !== k))
                }
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove keyword ${k}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitKeywordDraft();
              }
            }}
            className={inputCls}
            placeholder="Add keywords, separated by commas"
          />
          <button
            type="button"
            onClick={commitKeywordDraft}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Reason for update <span className="text-destructive">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`${inputCls} min-h-20`}
          placeholder="What is being changed and why?"
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Finalise panel ─────────────────────────────────────────────────────────

function FinalisePanel({
  opinion,
  onClose,
}: {
  opinion: Opinion;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await finaliseLegalOpinion({ id: opinion.id, version: opinion.version });
      onClose();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Finalisation failed.";
      setError(
        msg === "SIGNED_OPINION_REQUIRED"
          ? "Attach a signed opinion document before finalising."
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Finalise opinion
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-foreground">
        Finalising is <span className="font-semibold">irreversible</span>. After this,
        no field or document may be changed. To correct the opinion later, issue a
        new opinion that supersedes it.
      </p>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          {submitting ? "Finalising…" : "Finalise opinion"}
        </button>
      </div>
    </div>
  );
}

// ─── Documents panel ────────────────────────────────────────────────────────

function DocumentsPanel({
  opinionId,
  documents,
  canUpload,
  canWithdraw,
  isFinalised,
}: {
  opinionId: string;
  documents: Attachment[];
  canUpload: boolean;
  canWithdraw: boolean;
  isFinalised: boolean;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState("signed_opinion");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  async function submit() {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Choose at least one file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("opinionId", opinionId);
      fd.append("documentType", docType);
      Array.from(selectedFiles).forEach((f) => fd.append("files", f));
      await uploadLegalOpinionDocument(fd);
      setSelectedFiles(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function startWithdraw(id: string) {
    setWithdrawingId(id);
    setWithdrawReason("");
    setWithdrawError(null);
  }
  function cancelWithdraw() {
    setWithdrawingId(null);
    setWithdrawReason("");
    setWithdrawError(null);
  }
  async function confirmWithdraw() {
    if (!withdrawingId) return;
    if (withdrawReason.trim().length < 10) {
      setWithdrawError("Give a reason (10 chars minimum).");
      return;
    }
    setWithdrawError(null);
    setWithdrawSubmitting(true);
    try {
      await withdrawLegalOpinionDocument({
        documentId: withdrawingId,
        reason: withdrawReason.trim(),
      });
      cancelWithdraw();
      router.refresh();
    } catch (e) {
      setWithdrawError(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  const uploadEnabled = canUpload && !isFinalised;
  const withdrawEnabled = canWithdraw && !isFinalised;

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">Documents</h2>
        <span className="text-xs text-muted-foreground">
          {documents.length} file(s)
        </span>
      </div>

      {uploadEnabled && (
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
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="text-sm"
            />
            <button
              onClick={submit}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((d) => (
            <li key={d.id} className="py-3">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {d.fileName}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-semibold uppercase bg-muted text-muted-foreground">
                      {DOC_LABEL[d.documentType] ?? d.documentType}
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
                {withdrawEnabled && withdrawingId !== d.id && (
                  <button
                    onClick={() => startWithdraw(d.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Withdraw
                  </button>
                )}
              </div>
              {withdrawEnabled && withdrawingId === d.id && (
                <div className="mt-3 ml-7 p-3 rounded-md border border-destructive/30 bg-destructive/5 space-y-2">
                  <label className="block text-xs font-semibold text-destructive">
                    Reason for withdrawing this document
                  </label>
                  <textarea
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    className={`${inputCls} min-h-16`}
                    placeholder="10 characters minimum"
                    autoFocus
                  />
                  {withdrawError && (
                    <p className="text-xs text-destructive font-medium">{withdrawError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelWithdraw}
                      disabled={withdrawSubmitting}
                      className="px-2 py-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmWithdraw}
                      disabled={withdrawSubmitting}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {withdrawSubmitting ? "Withdrawing…" : "Confirm withdraw"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function LegalOpinionDetailClient({
  opinion,
  documents,
  supersedes,
  supersededBy,
  permissions,
}: {
  opinion: Opinion;
  documents: Attachment[];
  supersedes: { id: string; opinionRef: string } | null;
  supersededBy: { id: string; opinionRef: string } | null;
  permissions: Permissions;
}) {
  const [editing, setEditing] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const state = opinion.state as LegalOpinionState;
  const isFinalised = state === "finalised";
  const readyToFinalise = isReadyToFinalise(documents);
  const isSuperseded = !!supersededBy;

  return (
    <div className="space-y-6">
      <Link
        href="/legal-opinions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to legal opinions
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Opinion
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight tabular-nums">
            {opinion.opinionRef}
          </h1>
          <p className="mt-1 text-lg text-foreground">{opinion.subjectMatter}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold ${STATE_STYLES[state]}`}
          >
            {LEGAL_OPINION_STATE_LABELS[state]}
          </span>
          {isSuperseded && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-muted-foreground text-background"
              title={`Superseded by ${supersededBy?.opinionRef}`}
            >
              <History className="w-3.5 h-3.5" />
              Superseded
            </span>
          )}
          {!isFinalised && !readyToFinalise && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-warning/10 text-warning"
              title="No signed opinion attached"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Signed opinion missing
            </span>
          )}
          {permissions.update && !isFinalised && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {permissions.finalise && !isFinalised && (
            <button
              onClick={() => setFinalising((v) => !v)}
              disabled={!readyToFinalise}
              title={
                readyToFinalise
                  ? undefined
                  : "Attach a signed opinion document before finalising."
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finalise
            </button>
          )}
          {isFinalised && permissions.createSuperseding && (
            <Link
              href={`/legal-opinions/new?supersedes=${opinion.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Correct as new opinion
            </Link>
          )}
        </div>
      </div>

      {editing && <EditPanel opinion={opinion} onClose={() => setEditing(false)} />}
      {finalising && (
        <FinalisePanel opinion={opinion} onClose={() => setFinalising(false)} />
      )}

      {isFinalised && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Finalised on {fmtDateTime(opinion.finalisedAt)}
            {opinion.finaliserName ? ` by ${opinion.finaliserName}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Per BR-M4-01 this record is locked. To correct it, issue a new opinion
            that supersedes this one.
          </p>
        </div>
      )}

      {isSuperseded && supersededBy && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Superseded by{" "}
            <Link
              href={`/legal-opinions/${supersededBy.id}`}
              className="font-semibold text-primary hover:underline tabular-nums"
            >
              {supersededBy.opinionRef}
            </Link>
          </p>
        </div>
      )}

      {supersedes && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Supersedes{" "}
            <Link
              href={`/legal-opinions/${supersedes.id}`}
              className="font-semibold text-primary hover:underline tabular-nums"
            >
              {supersedes.opinionRef}
            </Link>
          </p>
        </div>
      )}

      {/* Overview */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Reference">{opinion.opinionRef}</Field>
          <Field label="State">{LEGAL_OPINION_STATE_LABELS[state]}</Field>
          <Field label="Author">{opinion.authorName ?? "—"}</Field>
          <Field label="Requesting department">{opinion.requestingDepartment}</Field>
          <Field label="Date requested">{fmtDate(opinion.dateRequested)}</Field>
          <Field label="Opinion date">{fmtDate(opinion.opinionDate)}</Field>
          <Field label="Created">{fmtDateTime(opinion.createdAt)}</Field>
          <Field label="Finalised">
            {opinion.finalisedAt ? fmtDateTime(opinion.finalisedAt) : "—"}
          </Field>
          <Field label="Finalised by">{opinion.finaliserName ?? "—"}</Field>
        </div>
        {opinion.summary && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
              Summary
            </p>
            <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
              {opinion.summary}
            </p>
          </div>
        )}
        {opinion.keywords.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
              Keywords
            </p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {opinion.keywords.map((k) => (
                <li
                  key={k}
                  className="inline-block px-2 py-1 rounded-sm text-sm bg-muted text-foreground"
                >
                  #{k}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DocumentsPanel
        opinionId={opinion.id}
        documents={documents}
        canUpload={permissions.upload}
        canWithdraw={permissions.withdraw}
        isFinalised={isFinalised}
      />
    </div>
  );
}
