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
} from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import {
  insurancePolicyStatus,
  INSURANCE_POLICY_STATUS_LABELS,
  daysToExpiry,
  type InsurancePolicyStatus,
} from "@/lib/insurance-policy-status";
import { updateInsurancePolicy } from "@/app/actions/update-insurance-policy";
import {
  uploadInsuranceDocument,
  withdrawInsuranceDocument,
} from "@/app/actions/upload-insurance-document";

type Policy = {
  id: string;
  policyRef: string;
  policyNumber: string;
  insurerName: string;
  insurerContact: string | null;
  policyType: string;
  insuredSubject: string;
  linkedTitleId: string | null;
  coverageStart: string;
  coverageEnd: string;
  policyValue: string;
  premiumAmount: string | null;
  currency: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdByName: string | null;
};

type Attachment = {
  id: string;
  insurancePolicyId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date;
  presignedUrl?: string;
};

type Permissions = {
  update: boolean;
  upload: boolean;
  withdraw: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  medical: "Medical",
  property: "Property",
};

const STATUS_STYLES: Record<InsurancePolicyStatus, string> = {
  active: "bg-primary text-white",
  expiring_soon: "bg-warning/15 text-warning",
  expired: "bg-muted-foreground text-background",
};

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "policy_schedule", label: "Policy schedule" },
  { value: "renewal_notice", label: "Renewal notice" },
  { value: "claim_document", label: "Claim document" },
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
function fmtMoney(v: string | number | null, currency: string) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return `${currency.toUpperCase()} ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function EditPanel({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  const router = useRouter();
  const [policyNumber, setPolicyNumber] = useState(policy.policyNumber);
  const [insurerName, setInsurerName] = useState(policy.insurerName);
  const [insurerContact, setInsurerContact] = useState(policy.insurerContact ?? "");
  const [policyType, setPolicyType] = useState(policy.policyType);
  const [insuredSubject, setInsuredSubject] = useState(policy.insuredSubject);
  const [linkedTitleId, setLinkedTitleId] = useState(policy.linkedTitleId ?? "");
  const [coverageStart, setCoverageStart] = useState(policy.coverageStart);
  const [coverageEnd, setCoverageEnd] = useState(policy.coverageEnd);
  const [policyValue, setPolicyValue] = useState<number | "">(Number(policy.policyValue));
  const [premiumAmount, setPremiumAmount] = useState<number | "">(
    policy.premiumAmount === null || policy.premiumAmount === ""
      ? ""
      : Number(policy.premiumAmount),
  );
  const [currency, setCurrency] = useState(policy.currency);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError("Give a reason for this update (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await updateInsurancePolicy({
        id: policy.id,
        version: policy.version,
        policyNumber: policyNumber.trim(),
        insurerName: insurerName.trim(),
        insurerContact: insurerContact.trim() || null,
        policyType,
        insuredSubject: insuredSubject.trim(),
        linkedTitleId: linkedTitleId.trim() || null,
        coverageStart,
        coverageEnd,
        policyValue: policyValue === "" ? 0 : Number(policyValue),
        premiumAmount: premiumAmount === "" ? null : Number(premiumAmount),
        currency,
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
        <h3 className="font-serif text-lg font-semibold text-foreground">Edit policy</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Insurer</label>
          <input
            value={insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Policy number</label>
          <input
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Insurer contact</label>
          <input
            value={insurerContact}
            onChange={(e) => setInsurerContact(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
            className={inputCls}
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Insured asset or person</label>
          <input
            value={insuredSubject}
            onChange={(e) => setInsuredSubject(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Coverage start</label>
          <DateField value={coverageStart} onChange={setCoverageStart} />
        </div>
        <div>
          <label className={labelCls}>Coverage end</label>
          <DateField value={coverageEnd} onChange={setCoverageEnd} />
        </div>
        <div>
          <label className={labelCls}>Sum insured</label>
          <AmountInput
            value={policyValue}
            onChange={(e) =>
              setPolicyValue(e.target.value === "" ? "" : Number(e.target.value))
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Premium amount</label>
          <AmountInput
            value={premiumAmount}
            onChange={(e) =>
              setPremiumAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            {["sbd", "usd", "aud", "nzd", "eur", "other"].map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Linked title</label>
          <input
            value={linkedTitleId}
            onChange={(e) => setLinkedTitleId(e.target.value)}
            className={inputCls}
          />
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

// ─── Documents panel ────────────────────────────────────────────────────────

function DocumentsPanel({
  policyId,
  documents,
  canUpload,
  canWithdraw,
}: {
  policyId: string;
  documents: Attachment[];
  canUpload: boolean;
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState("policy_schedule");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // In-place withdraw confirmation: track which attachment is being confirmed
  // (memory: no native browser dialogs — build in-place UI).
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
      fd.append("policyId", policyId);
      fd.append("documentType", docType);
      Array.from(selectedFiles).forEach((f) => fd.append("files", f));
      await uploadInsuranceDocument(fd);
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
      await withdrawInsuranceDocument({
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

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">Documents</h2>
        <span className="text-xs text-muted-foreground">{documents.length} file(s)</span>
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
                {canWithdraw && withdrawingId !== d.id && (
                  <button
                    onClick={() => startWithdraw(d.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Withdraw
                  </button>
                )}
              </div>
              {canWithdraw && withdrawingId === d.id && (
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

export default function InsuranceDetailClient({
  policy,
  documents,
  permissions,
}: {
  policy: Policy;
  documents: Attachment[];
  permissions: Permissions;
}) {
  const [editing, setEditing] = useState(false);
  const status = insurancePolicyStatus({ coverageEnd: policy.coverageEnd });
  const hasSchedule = documents.some((d) => d.documentType === "policy_schedule");
  const days = daysToExpiry(policy.coverageEnd) ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/insurance"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to insurance
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Policy
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight tabular-nums">
            {policy.policyRef}
          </h1>
          <p className="mt-1 text-lg text-foreground">
            {policy.insurerName} · #{policy.policyNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold ${STATUS_STYLES[status]}`}
          >
            {INSURANCE_POLICY_STATUS_LABELS[status]}
            {status === "expiring_soon" && ` · ${days}d`}
            {status === "expired" && ` · ${Math.abs(days)}d ago`}
          </span>
          {!hasSchedule && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-warning/10 text-warning"
              title="No policy schedule attached"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Policy schedule missing
            </span>
          )}
          {permissions.update && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {editing && <EditPanel policy={policy} onClose={() => setEditing(false)} />}

      {/* Overview */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Reference">{policy.policyRef}</Field>
          <Field label="Policy number">{policy.policyNumber}</Field>
          <Field label="Type">{TYPE_LABELS[policy.policyType] ?? policy.policyType}</Field>
          <Field label="Insurer">{policy.insurerName}</Field>
          <Field label="Insurer contact">{policy.insurerContact ?? "—"}</Field>
          <Field label="Status">{INSURANCE_POLICY_STATUS_LABELS[status]}</Field>
          <Field label="Coverage start">{fmtDate(policy.coverageStart)}</Field>
          <Field label="Coverage end">{fmtDate(policy.coverageEnd)}</Field>
          <Field label="Sum insured">{fmtMoney(policy.policyValue, policy.currency)}</Field>
          <Field label="Premium">{fmtMoney(policy.premiumAmount, policy.currency)}</Field>
          <Field label="Linked title">{policy.linkedTitleId ?? "—"}</Field>
          <Field label="Created">{fmtDateTime(policy.createdAt)}</Field>
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Insured subject
          </p>
          <p className="mt-1 text-sm text-foreground">{policy.insuredSubject}</p>
        </div>
      </div>

      <DocumentsPanel
        policyId={policy.id}
        documents={documents}
        canUpload={permissions.upload}
        canWithdraw={permissions.withdraw}
      />
    </div>
  );
}
