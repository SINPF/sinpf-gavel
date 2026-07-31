"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Gavel, HandshakeIcon, ScrollText,
  CheckCircle2, Clock, ChevronRight, Plus, X, Upload,
  Download, FileSpreadsheet, Loader2, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import Modal from "@/components/ui/Modal";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import type { CaseDetail, CaseAttachment } from "@/db/types";
import { updateCaseStage, type CaseStage } from "@/app/actions/update-case-stage";
import { addCaseProceeding } from "@/app/actions/add-case-proceeding";
import { closeCase } from "@/app/actions/close-case";
import { addCaseActivity } from "@/app/actions/add-case-activity";
import { uploadCaseDocument } from "@/app/actions/upload-case-document";
import { recordPayment } from "@/app/actions/record-payment";
import { undoLastAction } from "@/app/actions/undo-last-action";

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { key: CaseStage; label: string; icon: React.ReactNode }[] = [
  { key: "registered",   label: "Registered",    icon: <FileText className="w-4 h-4" /> },
  { key: "assessment",   label: "Assessment",    icon: <ScrollText className="w-4 h-4" /> },
  { key: "demand_issued",label: "Demand issued", icon: <FileText className="w-4 h-4" /> },
  { key: "negotiation",  label: "Negotiation",   icon: <HandshakeIcon className="w-4 h-4" /> },
  { key: "prosecution",  label: "Prosecution",   icon: <Gavel className="w-4 h-4" /> },
  { key: "closed",       label: "Closed",        icon: <CheckCircle2 className="w-4 h-4" /> },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

const VALID_TRANSITIONS: Record<string, CaseStage[]> = {
  registered:    ["assessment"],
  assessment:    ["demand_issued", "prosecution"],
  demand_issued: ["negotiation", "prosecution"],
  negotiation:   ["prosecution"],
  prosecution:   [],
  closed:        [],
};

const ACTIVITY_LABELS: Record<string, string> = {
  stage_changed:           "Stage changed",
  assessment_completed:    "Assessment completed",
  demand_letter_issued:    "Demand letter issued",
  negotiation_entered:     "Negotiation entered",
  negotiation_completed:   "Negotiation completed",
  prosecution_filed:       "Prosecution filed",
  hearing_scheduled:       "Hearing scheduled",
  consent_order_entered:   "Consent order entered",
  default_judgment_filed:  "Default judgment filed",
  enforcement_filed:       "Enforcement filed",
  case_discontinued:       "Case discontinued",
  case_closed:             "Case closed",
  document_added:          "Document added",
  note_added:              "Note added",
  payment_recorded:        "Payment recorded",
  action_undone:           "Action undone",
};

const UNDOABLE_TYPES = new Set(["payment_recorded", "note_added", "stage_changed"]);

// ─── Stage Stepper ────────────────────────────────────────────────────────────

function StageStepper({
  status,
  caseId,
  orientation = "horizontal",
}: {
  status: string;
  caseId?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const router = useRouter();
  const currentIdx  = STAGE_ORDER.indexOf(status as CaseStage);
  const isClosed    = status === "closed";
  const validNext   = VALID_TRANSITIONS[status] ?? [];

  const handleClick = async (key: CaseStage) => {
    if (!caseId || !validNext.includes(key) || loadingStage) return;
    setLoadingStage(key);
    await updateCaseStage(caseId, key);
    setLoadingStage(null);
    router.refresh();
  };

  if (orientation === "vertical") {
    return (
      <div className="flex flex-col">
        {STAGES.map(({ key, label, icon }, i) => {
          const isDone      = i < currentIdx;
          const isActive    = i === currentIdx;
          const isLast      = i === STAGES.length - 1;
          const isLoading   = loadingStage === key;
          const isReachable = !!caseId && !isClosed && !loadingStage && validNext.includes(key);

          return (
            <div key={key} className="flex gap-3">
              {/* Rail column: circle + connector */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleClick(key)}
                  disabled={!isReachable}
                  title={isReachable ? `Move to ${label}` : undefined}
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isDone      ? "bg-success border-success text-white cursor-default" :
                    isActive    ? "bg-primary border-primary text-primary-foreground cursor-default" :
                    isReachable ? "bg-background border-primary/50 text-primary/70 cursor-pointer hover:bg-blue-50 hover:border-primary" :
                                  "bg-background border-border/50 text-muted-foreground/30 cursor-default"
                  }`}
                >
                  {isLoading
                    ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    : isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="scale-90">{icon}</span>}
                </button>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 min-h-4 ${i < currentIdx ? "bg-success" : "bg-border/50"}`} />
                )}
              </div>
              {/* Label */}
              <div className={`pt-1.5 pb-4 text-sm font-semibold ${
                isActive    ? "text-primary" :
                isDone      ? "text-success" :
                isReachable ? "text-primary/70" :
                              "text-muted-foreground/40"
              }`}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {STAGES.map(({ key, label, icon }, i) => {
        const isDone      = i < currentIdx;
        const isActive    = i === currentIdx;
        const isLast      = i === STAGES.length - 1;
        const isLoading   = loadingStage === key;
        const isReachable = !!caseId && !isClosed && !loadingStage && validNext.includes(key);

        return (
          <div key={key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleClick(key)}
                disabled={!isReachable}
                title={isReachable ? `Move to ${label}` : undefined}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isDone      ? "bg-success border-success text-white cursor-default" :
                  isActive    ? "bg-primary border-primary text-primary-foreground cursor-default" :
                  isReachable ? "bg-background border-primary/50 text-primary/70 cursor-pointer hover:bg-blue-50 hover:border-primary" :
                                "bg-background border-border/50 text-muted-foreground/30 cursor-default"
                }`}
              >
                {isLoading
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : isDone ? <CheckCircle2 className="w-4 h-4" /> : icon}
              </button>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap ${
                isActive    ? "text-primary" :
                isDone      ? "text-success" :
                isReachable ? "text-primary/60" :
                              "text-muted-foreground/30"
              }`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`w-12 h-0.5 mb-5 mx-1 ${i < currentIdx ? "bg-success" : "bg-border/50"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Stage Actions ────────────────────────────────────────────────────────────

function StageActions({ caseId, status }: { caseId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const router = useRouter();

  const advance = async (stage: CaseStage, notes?: string) => {
    setLoading(true);
    await updateCaseStage(caseId, stage, notes);
    setLoading(false);
    router.refresh();
  };

  const NEXT_ACTIONS: Record<string, { label: string; stage: CaseStage; optional?: boolean }[]> = {
    registered:    [{ label: "Begin assessment", stage: "assessment" }],
    assessment:    [
      { label: "Issue demand letter",  stage: "demand_issued", optional: true },
      { label: "File for prosecution", stage: "prosecution" },
    ],
    demand_issued: [
      { label: "Enter negotiation",    stage: "negotiation",  optional: true },
      { label: "File for prosecution", stage: "prosecution" },
    ],
    negotiation:   [
      { label: "File for prosecution", stage: "prosecution" },
    ],
    prosecution:   [],
    closed:        [],
  };

  const actions = NEXT_ACTIONS[status] ?? [];
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {actions.map(({ label, stage, optional }) => (
        <button
          key={stage}
          type="button"
          disabled={loading}
          onClick={() => advance(stage)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
            optional
              ? "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          }`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setShowNote(!showNote)}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add note
      </button>

      {showNote && (
        <div className="w-full mt-2 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter note…"
            className="flex-1 px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring"
          />
          <button
            type="button"
            disabled={!note.trim() || loading}
            onClick={async () => {
              setLoading(true);
              await addCaseActivity(caseId, "note_added", note.trim());
              setNote(""); setShowNote(false); setLoading(false);
              router.refresh();
            }}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            Save
          </button>
          <button type="button" title="Dismiss" onClick={() => setShowNote(false)} className="p-2 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Proceeding Form ──────────────────────────────────────────────────────

function AddProceedingForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("caseId", caseId);
    await addCaseProceeding(fd);
    setLoading(false);
    onDone();
    router.refresh();
  };

  const labelCls = "block text-sm font-medium text-foreground mb-1.5";
  const inputCls = "w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-md border border-border bg-muted/20">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Proceeding type</label>
          <select name="proceedingType" required title="Proceeding type" className={inputCls}>
            {["trial","hearing","mention","consent_order","default_judgment","enforcement","discontinued"].map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Court</label>
          <select name="court" required title="Court" className={inputCls}>
            <option value="high_court">High Court</option>
            <option value="magistrates_court">Magistrates Court</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Hearing date</label>
          <input type="date" name="hearingDate" title="Hearing date" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Next date</label>
          <input type="date" name="nextDate" title="Next date" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Outcome notes</label>
        <textarea name="outcomeNotes" rows={2} className={`${inputCls} resize-none`} placeholder="Notes on outcome or proceedings…" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-md text-sm font-semibold border border-border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 transition-colors">
          {loading ? "Saving…" : "Record proceeding"}
        </button>
      </div>
    </form>
  );
}

// ─── Close Case Form ──────────────────────────────────────────────────────────

function CloseCaseForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("prosecution_completed");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("caseId", caseId);
    await closeCase(fd);
    setLoading(false);
    onDone();
    router.refresh();
  };

  const labelCls = "block text-sm font-medium text-foreground mb-1.5";
  const inputCls = "w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-md border border-destructive/30 bg-destructive/10">
      <p className="text-sm font-semibold text-destructive">This action will mark the case as closed and cannot be undone.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Closure type</label>
          <select name="closureType" required title="Closure type" className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="prosecution_completed">Prosecution completed</option>
            <option value="settlement_completed">Settlement completed</option>
            <option value="other">Other</option>
          </select>
        </div>
        {type === "other" && (
          <div>
            <label className={labelCls}>Reason</label>
            <select name="closureReason" title="Closure reason" className={inputCls}>
              <option value="statute_barred">Statute barred</option>
              <option value="incomplete_for_prosecution">Incomplete for prosecution</option>
              <option value="employer_complied">Employer complied</option>
              <option value="withdrawn_by_sinpf">Withdrawn by SINPF</option>
              <option value="settled_out_of_court">Settled out of court</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>Closing notes</label>
        <textarea name="notes" rows={2} className={`${inputCls} resize-none`} placeholder="Final notes on case closure…" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-md text-sm font-semibold border border-border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-6 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:opacity-50 transition-colors">
          {loading ? "Closing…" : "Close case"}
        </button>
      </div>
    </form>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf:   <FileText className="w-4 h-4 text-destructive" />,
  excel: <FileSpreadsheet className="w-4 h-4 text-success" />,
  csv:   <FileSpreadsheet className="w-4 h-4 text-success" />,
};

function DocumentsSection({ caseId, status, documents }: { caseId: string; status: string; documents: CaseAttachment[] }) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const isClosed = status === "closed";

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("caseId", caseId);
      fd.append("stage", status);
      Array.from(files).forEach((f) => fd.append("files", f));
      await uploadCaseDocument(fd);
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Documents</p>
          {documents.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
              {documents.length}
            </span>
          )}
        </div>
        {!isClosed && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              title="Upload documents"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {uploading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />}
              Upload document
            </button>
          </>
        )}
      </div>

      <div className="p-5">
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No documents attached to this case yet.</p>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 group px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
              >
                {FILE_ICON[doc.fileType] ?? <FileText className="w-4 h-4 text-muted-foreground" />}
                <span className="flex-1 text-sm text-foreground truncate">{doc.fileName}</span>
                <a
                  href={doc.presignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                  className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background hover:text-primary transition-all"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  unpaid_contributions: "Unpaid contributions",
  unpaid_surcharges:    "Unpaid surcharges",
  wages_record:         "Wages record",
};

function RecordPaymentForm({ caseId, types, onClose }: { caseId: string; types: string[]; onClose: () => void }) {
  const router   = useRouter();
  const [loading,     setLoading]     = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const singleType = types.length === 1 ? types[0] : null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("caseId", caseId);
    await recordPayment(fd);
    setLoading(false);
    onClose();
    router.refresh();
  };

  const labelCls = "block text-sm font-medium text-foreground mb-1.5";
  const inputCls =
    "w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground" +
    " focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors" +
    " placeholder:text-muted-foreground/60";

  return (
    <div className="w-full max-w-[560px] bg-card rounded-md border border-border shadow-lg overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border bg-muted/30">
        <h2 className="font-serif text-xl font-semibold text-foreground tracking-tight">
          Record payment
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 space-y-4 bg-linear-to-br from-background via-blue-50 to-blue-100">
          <div>
            <label className={labelCls} htmlFor="rp-type">Case type</label>
            {singleType ? (
              <>
                <input type="hidden" name="caseType" value={singleType} />
                <div className={`${inputCls} bg-muted/50 text-muted-foreground cursor-default select-none`}>
                  {TYPE_LABELS[singleType]}
                </div>
              </>
            ) : (
              <select id="rp-type" name="caseType" required className={inputCls}>
                {types.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="rp-amount">Amount</label>
              <AmountInput
                id="rp-amount"
                name="amount"
                required
                placeholder="0.00"
                className={`${inputCls} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Payment date</label>
              <input type="hidden" name="paymentDate" value={paymentDate} />
              <DateField value={paymentDate} onChange={setPaymentDate} />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="rp-ref">Reference <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="rp-ref" type="text" name="reference" placeholder="Bank / receipt ref…" className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="rp-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea id="rp-notes" name="notes" rows={2} placeholder="Optional notes…" className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
              loading
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Saving…" : "Save payment"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Financial Card ───────────────────────────────────────────────────────────

function FinancialCard({ c, isClosed }: { c: CaseDetail; isClosed: boolean }) {
  const [showModal, setShowModal] = useState(false);

  const paidContributions = c.payments.reduce((sum, p) => sum + Number(p.contributionsPaid), 0);
  const paidSurcharges    = c.payments.reduce((sum, p) => sum + Number(p.surchargesPaid), 0);
  const paidWages         = c.payments.reduce((sum, p) => sum + Number(p.wagesPaid), 0);
  const totalPaid         = paidContributions + paidSurcharges + paidWages;
  const grandTotalClaim   = Number(c.grandTotalClaim);
  const outstanding       = grandTotalClaim - totalPaid;
  const isFullyRecovered  = outstanding <= 0 && grandTotalClaim > 0;

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "SBD" });

  const rows = [
    { key: "unpaid_contributions", label: "Contributions", claim: Number(c.totalContributions), paid: paidContributions },
    { key: "unpaid_surcharges",    label: "Surcharges",    claim: Number(c.totalSurcharges),    paid: paidSurcharges    },
    { key: "wages_record",         label: "Wages Record",  claim: Number(c.wagesRecord),        paid: paidWages         },
  ].filter((r) => c.types.includes(r.key));

  return (
    <>
    {!isClosed && (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Record payment
        </button>
      </div>
    )}
    <div className="relative rounded-md overflow-hidden bg-card border border-primary/30">
      <div className="relative p-6 space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Financial summary</p>

        {/* Column headers */}
        <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em] border-b border-border pb-2">
          <span />
          <span className="text-right">Claim</span>
          <span className="text-right">Paid</span>
          <span className="text-right">Owed</span>
        </div>

        {/* Breakdown rows */}
        <div className="space-y-2">
          {rows.map(({ label, claim, paid }) => {
            const owed = Math.max(0, claim - paid);
            return (
              <div key={label} className="grid grid-cols-4 gap-1 items-center">
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="text-right text-[11px] tabular-nums text-foreground">{fmt(claim)}</span>
                <span className="text-right text-[11px] tabular-nums text-success">{paid > 0 ? fmt(paid) : "—"}</span>
                <span className={`text-right text-[11px] tabular-nums font-semibold ${owed > 0 ? "text-highlight-foreground" : "text-success"}`}>
                  {fmt(owed)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Grand total */}
        <div className="pt-3 border-t border-border space-y-1">
          <div className="grid grid-cols-4 gap-1 items-baseline">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] col-span-1">Total</span>
            <span className="text-right text-xs tabular-nums font-semibold text-foreground">{fmt(grandTotalClaim)}</span>
            <span className="text-right text-xs tabular-nums font-semibold text-success">{totalPaid > 0 ? fmt(totalPaid) : "—"}</span>
            <span className={`text-right text-2xl tabular-nums font-bold leading-none ${outstanding > 0 ? "text-primary" : "text-success"}`}>
              {fmt(Math.max(0, outstanding))}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">Outstanding · SBD</p>
        </div>

        {isFullyRecovered && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-success/10 border border-success/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            <span className="text-xs font-semibold text-success">Fully recovered</span>
          </div>
        )}

      </div>
    </div>

    {/* Payment history card */}
    {c.payments.length > 0 && (
      <div className="mt-4 rounded-md border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Payment history</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
            {c.payments.length}
          </span>
        </div>
        <div className="p-6 space-y-2">
          {c.payments.map((p) => {
            const amount = Number(p.contributionsPaid) + Number(p.surchargesPaid) + Number(p.wagesPaid);
            const typeLabel =
              Number(p.contributionsPaid) > 0 ? "Contributions" :
              Number(p.surchargesPaid)    > 0 ? "Surcharges" :
              Number(p.wagesPaid)         > 0 ? "Wages record" : null;
            return (
              <div key={p.id} className="flex items-start justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-foreground tabular-nums font-medium">{p.paymentDate}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {typeLabel}{p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-success shrink-0">
                  {fmt(amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {showModal && (
      <Modal onClose={() => setShowModal(false)}>
        <RecordPaymentForm caseId={c.id} types={c.types} onClose={() => setShowModal(false)} />
      </Modal>
    )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = "overview" | "documents" | "proceedings" | "activity";

export default function CaseDetailClient({ caseDetail: c }: { caseDetail: CaseDetail }) {
  const router = useRouter();
  const [showProceedingForm, setShowProceedingForm] = useState(false);
  const [showCloseForm, setShowCloseForm]           = useState(false);
  const [activeTab, setActiveTab]                   = useState<TabId>("overview");
  const [undoLoading, setUndoLoading]               = useState(false);
  const isClosed = c.status === "closed";

  const lastActivity    = c.activities[0] ?? null;
  const undoableActivity = lastActivity && UNDOABLE_TYPES.has(lastActivity.activityType) ? lastActivity : null;

  const handleUndo = async () => {
    setUndoLoading(true);
    await undoLastAction(c.id);
    setUndoLoading(false);
    router.refresh();
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview",    label: "Financials" },
    { id: "documents",   label: "Documents",   count: c.documents.length   },
    { id: "proceedings", label: "Proceedings", count: c.proceedings.length },
    { id: "activity",    label: "Activity",    count: c.activities.length  },
  ];

  const labelCls = "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]";

  return (
    <div className="space-y-6">
      {/* Page header — matches the pattern used on Cases / Employers list pages */}
      <div className="mb-8 pb-4 border-b border-border flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-4 flex-wrap">
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight leading-tight">
            {c.employerName}
            {c.types.length > 0 && (
              <span className="text-primary">
                {" · "}
                <span className="capitalize">{c.types.map((t) => t.replace(/_/g, " ")).join(" · ")}</span>
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            Case referral · #{c.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <button
              type="button"
              onClick={() => setShowCloseForm(!showCloseForm)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Close case
            </button>
          )}
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back to cases
          </Link>
        </div>
      </div>

    <motion.div
      className="flex flex-col lg:flex-row gap-6 items-start"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* ── SIDEBAR ── */}
      <aside className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-6">
        {/* Meta card */}
        <div className="rounded-md border border-border bg-background p-5 space-y-3">
          <div>
            <Badge status={c.status as BadgeStatus} solid />
          </div>

          <dl className="pt-2 border-t border-border space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Referred</dt>
              <dd className="text-foreground tabular-nums">{c.referralDate}</dd>
            </div>
            {(c.assigneeName || c.assigneeEmail) && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground shrink-0">Assignee</dt>
                <dd className="text-foreground font-medium text-right truncate">{c.assigneeName || c.assigneeEmail}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Stage stepper card */}
        <div className="rounded-md border border-border bg-background p-5">
          <p className={`${labelCls} mb-4`}>Case stage</p>
          <StageStepper status={c.status} caseId={c.id} orientation="vertical" />
        </div>


        {/* Closure summary */}
        {c.closure && (
          <div className="rounded-md border border-border bg-background p-5">
            <p className={`${labelCls} mb-2`}>Closure</p>
            <p className="text-sm font-semibold text-foreground">
              {c.closure.closureType.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
            </p>
            {c.closure.closureReason && (
              <p className="text-xs text-muted-foreground mt-1">
                {c.closure.closureReason.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
              </p>
            )}
            {c.closure.notes && <p className="text-sm text-muted-foreground mt-2">{c.closure.notes}</p>}
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 w-full space-y-4">
        {/* Close case form (inline, above tabs) */}
        <AnimatePresence>
          {showCloseForm && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <CloseCaseForm caseId={c.id} onDone={() => setShowCloseForm(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab bar */}
        <div className="rounded-md border border-border bg-background overflow-hidden">
          <div className="flex px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`min-w-4.5 h-4.5 px-1 rounded-md text-[10px] font-semibold tabular-nums flex items-center justify-center ${
                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >

          {/* Financials */}
          {activeTab === "overview" && (
            <FinancialCard c={c} isClosed={isClosed} />
          )}

          {/* Documents */}
          {activeTab === "documents" && (
            <DocumentsSection caseId={c.id} status={c.status} documents={c.documents} />
          )}

          {/* Proceedings */}
          {activeTab === "proceedings" && (
            <div className="p-5 rounded-md border border-border bg-background">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Court proceedings</p>
                {!isClosed && c.status === "prosecution" && (
                  <button
                    type="button"
                    onClick={() => setShowProceedingForm(!showProceedingForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add proceeding
                  </button>
                )}
              </div>

              {showProceedingForm && (
                <div className="mb-4">
                  <AddProceedingForm caseId={c.id} onDone={() => setShowProceedingForm(false)} />
                </div>
              )}

              {c.proceedings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No court proceedings recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {c.proceedings.map((p) => (
                    <div key={p.id} className="flex gap-4 p-4 rounded-md border border-border bg-muted/20">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {p.proceedingType.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-[0.06em]">
                            {p.court === "high_court" ? "High Court" : "Magistrates Court"}
                          </span>
                        </div>
                        {p.hearingDate  && <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">Hearing: {p.hearingDate}</p>}
                        {p.nextDate     && <p className="text-xs text-muted-foreground tabular-nums">Next date: {p.nextDate}</p>}
                        {p.outcomeNotes && <p className="text-sm text-foreground/80 mt-1">{p.outcomeNotes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          {activeTab === "activity" && (
            <div className="p-5 rounded-md border border-border bg-background">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Activity log</p>
                {undoableActivity && !isClosed && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {undoLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RotateCcw className="w-3 h-3" />}
                    Undo: {ACTIVITY_LABELS[undoableActivity.activityType]}
                  </button>
                )}
              </div>
              {c.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {c.activities.map((a) => (
                      <div key={a.id} className="flex gap-4 relative">
                        <div className="w-7 h-7 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center shrink-0 z-10">
                          <Clock className="w-3 h-3 text-primary/60" />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {new Date(a.createdAt).toLocaleString("en-GB", {
                                day: "numeric", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {a.notes && <p className="text-sm text-muted-foreground mt-0.5">{a.notes}</p>}
                          {(a.performerName || a.performerEmail) && (
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                              by {a.performerName || a.performerEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
    </div>
  );
}
