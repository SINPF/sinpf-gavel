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
  Ban,
} from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import {
  contractStatus,
  CONTRACT_STATUS_LABELS,
  type ContractStatus,
} from "@/lib/contract-status";
import { updateContract } from "@/app/actions/update-contract";
import { terminateContract } from "@/app/actions/terminate-contract";
import {
  uploadContractDocument,
  withdrawContractDocument,
} from "@/app/actions/upload-contract-document";

type Contract = {
  id: string;
  contractRef: string;
  title: string;
  parties: string[];
  contractType: string;
  startDate: string;
  endDate: string;
  contractValue: string;
  currency: string;
  terminatedDate: string | null;
  terminationReason: string | null;
  terminatedBy: string | null;
  terminatedByName: string | null;
  owningDepartment: string | null;
  linkedTitleId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type Attachment = {
  id: string;
  contractId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: Date;
  presignedUrl?: string;
};

type Permissions = {
  update: boolean;
  terminate: boolean;
  upload: boolean;
  withdraw: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  lease: "Lease",
  service_agreement: "Service agreement",
  mou: "MOU",
  supply: "Supply",
  consultancy: "Consultancy",
  other: "Other",
};

const STATUS_STYLES: Record<ContractStatus, string> = {
  active: "bg-primary text-white",
  expired: "bg-muted-foreground text-background",
  terminated: "bg-destructive/10 text-destructive",
};

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "signed_contract", label: "Signed contract" },
  { value: "draft_contract", label: "Draft contract" },
  { value: "variation_addendum", label: "Variation / addendum" },
  { value: "termination_notice", label: "Termination notice" },
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
function fmtMoney(v: string | number, currency: string) {
  const n = Number(v ?? 0);
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

function EditPanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(contract.title);
  const [parties, setParties] = useState<string[]>(contract.parties);
  const [contractType, setContractType] = useState(contract.contractType);
  const [startDate, setStartDate] = useState(contract.startDate);
  const [endDate, setEndDate] = useState(contract.endDate);
  const [contractValue, setContractValue] = useState<number | "">(Number(contract.contractValue));
  const [currency, setCurrency] = useState(contract.currency);
  const [owningDepartment, setOwningDepartment] = useState(contract.owningDepartment ?? "");
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
      await updateContract({
        id: contract.id,
        version: contract.version,
        title,
        parties: parties.map((p) => p.trim()).filter(Boolean),
        contractType,
        startDate,
        endDate,
        contractValue: contractValue === "" ? 0 : Number(contractValue),
        currency,
        owningDepartment: owningDepartment.trim() || null,
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
        <h3 className="font-serif text-lg font-semibold text-foreground">Edit contract</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className={labelCls}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Parties</label>
        <div className="space-y-2">
          {parties.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={p}
                onChange={(e) =>
                  setParties((cur) => cur.map((row, idx) => (idx === i ? e.target.value : row)))
                }
                className={inputCls}
                placeholder={`Party ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => setParties((cur) => cur.filter((_, idx) => idx !== i))}
                className="p-2 text-muted-foreground hover:text-destructive rounded-md"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setParties((cur) => [...cur, ""])}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          + Add party
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
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
          <label className={labelCls}>Owning department</label>
          <input
            value={owningDepartment}
            onChange={(e) => setOwningDepartment(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Start date</label>
          <DateField value={startDate} onChange={setStartDate} />
        </div>
        <div>
          <label className={labelCls}>End date</label>
          <DateField value={endDate} onChange={setEndDate} />
        </div>
        <div>
          <label className={labelCls}>Value</label>
          <AmountInput
            value={contractValue}
            onChange={(e) =>
              setContractValue(e.target.value === "" ? "" : Number(e.target.value))
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

function TerminatePanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const router = useRouter();
  const [terminatedDate, setTerminatedDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError("Give a reason for the termination (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await terminateContract({
        id: contract.id,
        version: contract.version,
        terminatedDate,
        reason: reason.trim(),
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to terminate.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-destructive/5 border border-destructive/30 rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">Terminate contract</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Termination is permanent. The contract becomes read-only after saving.
      </p>
      <div>
        <label className={labelCls}>Termination date</label>
        <DateField value={terminatedDate} onChange={setTerminatedDate} />
      </div>
      <div>
        <label className={labelCls}>
          Reason <span className="text-destructive">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`${inputCls} min-h-20`}
          placeholder="Explain why this contract is being terminated."
        />
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Ban className="w-4 h-4" />
          {submitting ? "Terminating…" : "Terminate contract"}
        </button>
      </div>
    </div>
  );
}

function DocumentsPanel({
  contractId,
  documents,
  canUpload,
  canWithdraw,
}: {
  contractId: string;
  documents: Attachment[];
  canUpload: boolean;
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState("signed_contract");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useState<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  async function submit() {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Choose at least one file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("contractId", contractId);
      fd.append("documentType", docType);
      Array.from(selectedFiles).forEach((f) => fd.append("files", f));
      await uploadContractDocument(fd);
      setSelectedFiles(null);
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
      await withdrawContractDocument({ documentId: id, reason });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
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
            <li key={d.id} className="py-3 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{d.fileName}</span>
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
              {canWithdraw && (
                <button
                  onClick={() => handleWithdraw(d.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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

// ─── Main ─────────────────────────────────────────────────────────────────

export default function ContractDetailClient({
  contract,
  documents,
  permissions,
}: {
  contract: Contract;
  documents: Attachment[];
  permissions: Permissions;
}) {
  const [editing, setEditing] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const status = contractStatus({ endDate: contract.endDate, terminatedDate: contract.terminatedDate });
  const hasSignedDoc = documents.some((d) => d.documentType === "signed_contract");
  const isTerminated = status === "terminated";

  return (
    <div className="space-y-6">
      <Link
        href="/contracts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to contracts
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Contract
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight tabular-nums">
            {contract.contractRef}
          </h1>
          <p className="mt-1 text-lg text-foreground">{contract.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold ${STATUS_STYLES[status]}`}
          >
            {CONTRACT_STATUS_LABELS[status]}
          </span>
          {!hasSignedDoc && !isTerminated && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-warning/10 text-warning"
              title="No signed contract attached"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Signed contract missing
            </span>
          )}
          {permissions.update && !isTerminated && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {permissions.terminate && !isTerminated && (
            <button
              onClick={() => setTerminating((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-destructive/30 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Terminate
            </button>
          )}
        </div>
      </div>

      {editing && <EditPanel contract={contract} onClose={() => setEditing(false)} />}
      {terminating && <TerminatePanel contract={contract} onClose={() => setTerminating(false)} />}

      {isTerminated && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">
            Terminated on {fmtDate(contract.terminatedDate)}
            {contract.terminatedByName ? ` by ${contract.terminatedByName}` : ""}
          </p>
          {contract.terminationReason && (
            <p className="mt-1 text-sm text-foreground">{contract.terminationReason}</p>
          )}
        </div>
      )}

      {/* Overview */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Reference">{contract.contractRef}</Field>
          <Field label="Type">{TYPE_LABELS[contract.contractType] ?? contract.contractType}</Field>
          <Field label="Status">{CONTRACT_STATUS_LABELS[status]}</Field>
          <Field label="Start date">{fmtDate(contract.startDate)}</Field>
          <Field label="End date">{fmtDate(contract.endDate)}</Field>
          <Field label="Value">{fmtMoney(contract.contractValue, contract.currency)}</Field>
          <Field label="Owning department">{contract.owningDepartment ?? "—"}</Field>
          <Field label="Linked title">{contract.linkedTitleId ?? "—"}</Field>
          <Field label="Created">{fmtDateTime(contract.createdAt)}</Field>
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Parties
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {contract.parties.map((p, i) => (
              <li
                key={i}
                className="inline-block px-2 py-1 rounded-sm text-sm bg-muted text-foreground"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DocumentsPanel
        contractId={contract.id}
        documents={documents}
        canUpload={permissions.upload && !isTerminated}
        canWithdraw={permissions.withdraw}
      />
    </div>
  );
}
