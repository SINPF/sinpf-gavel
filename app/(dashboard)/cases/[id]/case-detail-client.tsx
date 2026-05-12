"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Gavel, HandshakeIcon, ScrollText,
  CheckCircle2, Clock, ChevronRight, Plus, X, Upload,
  Download, FileSpreadsheet, Loader2,
} from "lucide-react";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import type { CaseDetail, CaseAttachment } from "@/db/types";
import { updateCaseStage, type CaseStage } from "@/app/actions/update-case-stage";
import { addCaseProceeding } from "@/app/actions/add-case-proceeding";
import { closeCase } from "@/app/actions/close-case";
import { addCaseActivity } from "@/app/actions/add-case-activity";
import { uploadCaseDocument } from "@/app/actions/upload-case-document";
import { recordPayment } from "@/app/actions/record-payment";

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { key: CaseStage; label: string; icon: React.ReactNode }[] = [
  { key: "registered",   label: "Registered",    icon: <FileText className="w-4 h-4" /> },
  { key: "assessment",   label: "Assessment",    icon: <ScrollText className="w-4 h-4" /> },
  { key: "demand_issued",label: "Demand Issued", icon: <FileText className="w-4 h-4" /> },
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
  stage_changed:           "Stage Changed",
  assessment_completed:    "Assessment Completed",
  demand_letter_issued:    "Demand Letter Issued",
  negotiation_entered:     "Negotiation Entered",
  negotiation_completed:   "Negotiation Completed",
  prosecution_filed:       "Prosecution Filed",
  hearing_scheduled:       "Hearing Scheduled",
  consent_order_entered:   "Consent Order Entered",
  default_judgment_filed:  "Default Judgment Filed",
  enforcement_filed:       "Enforcement Filed",
  case_discontinued:       "Case Discontinued",
  case_closed:             "Case Closed",
  document_added:          "Document Added",
  note_added:              "Note Added",
  payment_recorded:        "Payment Recorded",
};

// ─── Stage Stepper ────────────────────────────────────────────────────────────

function StageStepper({ status, caseId }: { status: string; caseId?: string }) {
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
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone      ? "bg-emerald-500 border-emerald-500 text-white cursor-default" :
                  isActive    ? "bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/30 cursor-default" :
                  isReachable ? "bg-background border-brand-blue/50 text-brand-blue/70 cursor-pointer hover:bg-brand-blue/5 hover:border-brand-blue hover:scale-110 hover:shadow-lg" :
                                "bg-background border-border/50 text-muted-foreground/30 cursor-default"
                }`}
              >
                {isLoading
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : isDone ? <CheckCircle2 className="w-4 h-4" /> : icon}
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                isActive    ? "text-brand-blue" :
                isDone      ? "text-emerald-600" :
                isReachable ? "text-brand-blue/60" :
                              "text-muted-foreground/30"
              }`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`w-12 h-0.5 mb-5 mx-1 ${i < currentIdx ? "bg-emerald-500" : "bg-border/50"}`} />
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
    registered:    [{ label: "Begin Assessment", stage: "assessment" }],
    assessment:    [
      { label: "Issue Demand Letter",  stage: "demand_issued", optional: true },
      { label: "File for Prosecution", stage: "prosecution" },
    ],
    demand_issued: [
      { label: "Enter Negotiation",    stage: "negotiation",  optional: true },
      { label: "File for Prosecution", stage: "prosecution" },
    ],
    negotiation:   [
      { label: "File for Prosecution", stage: "prosecution" },
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
            optional
              ? "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              : "bg-brand-blue text-white hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/20"
          }`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setShowNote(!showNote)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> Add Note
      </button>

      {showNote && (
        <div className="w-full mt-2 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter note…"
            className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
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
            className="px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 transition-all"
          >
            Save
          </button>
          <button type="button" title="Dismiss" onClick={() => setShowNote(false)} className="p-2 rounded-xl hover:bg-muted transition-all">
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

  const labelCls = "block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1.5";
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border border-border bg-muted/20">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Proceeding Type</label>
          <select name="proceedingType" required title="Proceeding Type" className={inputCls}>
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
          <label className={labelCls}>Hearing Date</label>
          <input type="date" name="hearingDate" title="Hearing Date" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Next Date</label>
          <input type="date" name="nextDate" title="Next Date" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Outcome Notes</label>
        <textarea name="outcomeNotes" rows={2} className={`${inputCls} resize-none`} placeholder="Notes on outcome or proceedings…" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-all">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 transition-all active:scale-95">
          {loading ? "Saving…" : "Record Proceeding"}
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

  const labelCls = "block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1.5";
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border border-red-200 bg-red-50/50">
      <p className="text-sm font-semibold text-red-600">This action will mark the case as closed and cannot be undone.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Closure Type</label>
          <select name="closureType" required title="Closure Type" className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="prosecution_completed">Prosecution Completed</option>
            <option value="settlement_completed">Settlement Completed</option>
            <option value="other">Other</option>
          </select>
        </div>
        {type === "other" && (
          <div>
            <label className={labelCls}>Reason</label>
            <select name="closureReason" title="Closure Reason" className={inputCls}>
              <option value="statute_barred">Statute Barred</option>
              <option value="incomplete_for_prosecution">Incomplete for Prosecution</option>
              <option value="employer_complied">Employer Complied</option>
              <option value="withdrawn_by_sinpf">Withdrawn by SINPF</option>
              <option value="settled_out_of_court">Settled Out of Court</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>Closing Notes</label>
        <textarea name="notes" rows={2} className={`${inputCls} resize-none`} placeholder="Final notes on case closure…" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-all">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95">
          {loading ? "Closing…" : "Close Case"}
        </button>
      </div>
    </form>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────

const FILE_ICON: Record<string, React.ReactNode> = {
  pdf:   <FileText className="w-4 h-4 text-red-500" />,
  excel: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
  csv:   <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
};

function StageDocuments({
  stageKey,
  stageLabel,
  docs,
  isCurrent,
  caseId,
}: {
  stageKey: string;
  stageLabel: string;
  docs: CaseAttachment[];
  isCurrent: boolean;
  caseId: string;
}) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("caseId", caseId);
      fd.append("stage", stageKey);
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
    <div className={`rounded-2xl border overflow-hidden ${isCurrent ? "border-brand-blue/30 bg-brand-blue/2" : "border-border bg-background"}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isCurrent ? "border-brand-blue/20 bg-brand-blue/5" : "border-border bg-muted/30"}`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? "text-brand-blue" : "text-muted-foreground"}`}>
            {stageLabel}
          </span>
          {docs.length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isCurrent ? "bg-brand-blue/15 text-brand-blue" : "bg-muted text-muted-foreground"}`}>
              {docs.length}
            </span>
          )}
        </div>
        {isCurrent && (
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-blue text-white text-[11px] font-bold hover:bg-brand-blue/90 disabled:opacity-50 transition-all active:scale-95"
            >
              {uploading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Upload className="w-3 h-3" />}
              Upload
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-3">
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 italic py-1">No documents</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 group">
                {FILE_ICON[doc.fileType] ?? <FileText className="w-4 h-4 text-muted-foreground" />}
                <span className="flex-1 text-xs text-foreground truncate">{doc.fileName}</span>
                <a
                  href={doc.presignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                  className="p-1 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsSection({ caseId, status, documents }: { caseId: string; status: string; documents: CaseAttachment[] }) {
  const activeStages = STAGES.filter((s) => s.key !== "closed");
  const byStage = Object.fromEntries(
    activeStages.map((s) => [s.key, documents.filter((d) => d.stage === s.key)])
  );

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Documents by Stage</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {activeStages.map((s) => (
          <StageDocuments
            key={s.key}
            stageKey={s.key}
            stageLabel={s.label}
            docs={byStage[s.key] ?? []}
            isCurrent={s.key === status}
            caseId={caseId}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  unpaid_contributions: "Unpaid Contributions",
  unpaid_surcharges:    "Unpaid Surcharges",
  wages_record:         "Wages Record",
};

function RecordPaymentModal({ caseId, types, onDone }: { caseId: string; types: string[]; onDone: () => void }) {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const singleType = types.length === 1 ? types[0] : null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.append("caseId", caseId);
    await recordPayment(fd);
    setLoading(false);
    onDone();
    router.refresh();
  };

  const lbl = "block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1.5";
  const inp = "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onDone}
      />
      <motion.div
        className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Record Payment</h2>
          <button type="button" onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted transition-all">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Case Type</label>
            {singleType ? (
              <>
                <input type="hidden" name="caseType" value={singleType} />
                <div className={`${inp} bg-muted/50 text-muted-foreground cursor-default select-none`}>
                  {TYPE_LABELS[singleType]}
                </div>
              </>
            ) : (
              <select name="caseType" required title="Case Type" className={inp}>
                {types.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className={lbl}>Amount *</label>
            <input
              type="number"
              name="amount"
              required
              title="Amount"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className={inp}
            />
          </div>

          <div>
            <label className={lbl}>Payment Date *</label>
            <input
              type="date"
              name="paymentDate"
              required
              title="Payment Date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className={inp}
            />
          </div>

          <div>
            <label className={lbl}>Reference</label>
            <input type="text" name="reference" placeholder="Bank / receipt ref…" className={inp} />
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea name="notes" rows={2} placeholder="Optional notes…" className={`${inp} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onDone}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? "Saving…" : "Save Payment"}
            </button>
          </div>
        </form>
      </motion.div>
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
    { label: "Contributions", claim: Number(c.totalContributions), paid: paidContributions },
    { label: "Surcharges",    claim: Number(c.totalSurcharges),    paid: paidSurcharges    },
    { label: "Wages Record",  claim: Number(c.wagesRecord),        paid: paidWages         },
  ];

  return (
    <>
    <div
      className="rounded-2xl overflow-hidden sticky top-4"
      style={{ background: "linear-gradient(145deg, #1e3d5f 0%, #162d48 60%, #0f1e30 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(8,159,255,0.2) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -left-4 bottom-0 w-32 h-32 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,223,24,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative p-6 space-y-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Summary</p>

        {/* Column headers */}
        <div className="grid grid-cols-4 gap-1 text-[9px] font-black text-slate-600 uppercase tracking-wider border-b border-white/8 pb-2">
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
                <span className="text-[10px] text-slate-500">{label}</span>
                <span className="text-right text-[11px] tabular-nums text-slate-400">{fmt(claim)}</span>
                <span className="text-right text-[11px] tabular-nums text-emerald-400">{paid > 0 ? fmt(paid) : "—"}</span>
                <span className={`text-right text-[11px] tabular-nums font-semibold ${owed > 0 ? "text-amber-300" : "text-emerald-400"}`}>
                  {fmt(owed)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Grand total */}
        <div className="pt-3 border-t border-white/10 space-y-1">
          <div className="grid grid-cols-4 gap-1 items-baseline">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider col-span-1">Total</span>
            <span className="text-right text-xs tabular-nums font-bold text-slate-300">{fmt(grandTotalClaim)}</span>
            <span className="text-right text-xs tabular-nums font-bold text-emerald-400">{totalPaid > 0 ? fmt(totalPaid) : "—"}</span>
            <span className={`text-right text-2xl tabular-nums font-black leading-none ${outstanding > 0 ? "text-amber-300" : "text-emerald-400"}`}>
              {fmt(Math.max(0, outstanding))}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 text-right">Outstanding · SBD</p>
        </div>

        {isFullyRecovered && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-300">Fully Recovered</span>
          </div>
        )}

        {/* Record payment */}
        {!isClosed && (
          <div className="border-t border-white/8 pt-3">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 hover:border-white/15 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Record Payment
            </button>
          </div>
        )}

        {/* Payment history */}
        {c.payments.length > 0 && (
          <div className="border-t border-white/8 pt-3 space-y-2">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              {c.payments.length} Payment{c.payments.length !== 1 ? "s" : ""} Recorded
            </p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {c.payments.map((p) => {
                const amount = Number(p.contributionsPaid) + Number(p.surchargesPaid) + Number(p.wagesPaid);
                const typeLabel =
                  Number(p.contributionsPaid) > 0 ? "Contributions" :
                  Number(p.surchargesPaid)    > 0 ? "Surcharges" :
                  Number(p.wagesPaid)         > 0 ? "Wages Record" : null;
                return (
                  <div key={p.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-300">{p.paymentDate}</p>
                      <p className="text-[10px] text-slate-500">
                        {typeLabel}{p.reference ? ` · ${p.reference}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-emerald-400 shrink-0">
                      {fmt(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    <AnimatePresence>
      {showModal && (
        <RecordPaymentModal caseId={c.id} types={c.types} onDone={() => setShowModal(false)} />
      )}
    </AnimatePresence>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = "overview" | "documents" | "proceedings" | "activity";

export default function CaseDetailClient({ caseDetail: c }: { caseDetail: CaseDetail }) {
  const [showProceedingForm, setShowProceedingForm] = useState(false);
  const [showCloseForm, setShowCloseForm]           = useState(false);
  const [activeTab, setActiveTab]                   = useState<TabId>("overview");
  const isClosed = c.status === "closed";

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview",    label: "Overview" },
    { id: "documents",   label: "Documents",   count: c.documents.length   },
    { id: "proceedings", label: "Proceedings", count: c.proceedings.length },
    { id: "activity",    label: "Activity",    count: c.activities.length  },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* ── Header card with integrated tab bar ── */}
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <Link
            href="/cases"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
          </Link>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{c.employerName}</h1>
                <Badge status={c.status as BadgeStatus} />
                {c.types.map((t) => (
                  <span key={t} className="px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[11px] font-bold">
                    {t.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">{c.employerCode}</span>
                <span>·</span>
                <span>Referred {c.referralDate}</span>
                {c.assigneeEmail && (
                  <>
                    <span>·</span>
                    <span>Assigned to <span className="font-semibold text-foreground">{c.assigneeName || c.assigneeEmail}</span></span>
                  </>
                )}
              </div>
            </div>

            {!isClosed && (
              <button
                type="button"
                onClick={() => setShowCloseForm(!showCloseForm)}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all"
              >
                Close Case
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === tab.id
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
                  activeTab === tab.id ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Close case form (inline, below header) ── */}
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

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

              {/* Left: stage + actions + closure */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-6 rounded-2xl border border-border bg-background overflow-x-auto">
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-5">Case Stage</p>
                  <StageStepper status={c.status} caseId={c.id} />
                </div>

                {!isClosed && (
                  <div className="p-5 rounded-2xl border border-border bg-background">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-3">Next Actions</p>
                    <StageActions caseId={c.id} status={c.status} />
                  </div>
                )}

                {c.closure && (
                  <div className="p-5 rounded-2xl border border-border bg-background">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-3">Closure</p>
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
              </div>

              {/* Right: financial card */}
              <FinancialCard c={c} isClosed={isClosed} />

            </div>
          )}

          {/* Documents */}
          {activeTab === "documents" && (
            <DocumentsSection caseId={c.id} status={c.status} documents={c.documents} />
          )}

          {/* Proceedings */}
          {activeTab === "proceedings" && (
            <div className="p-5 rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Court Proceedings</p>
                {!isClosed && c.status === "prosecution" && (
                  <button
                    type="button"
                    onClick={() => setShowProceedingForm(!showProceedingForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue text-xs font-bold hover:bg-brand-blue/20 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Proceeding
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
                    <div key={p.id} className="flex gap-4 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="w-2 h-2 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {p.proceedingType.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase">
                            {p.court === "high_court" ? "High Court" : "Magistrates Court"}
                          </span>
                        </div>
                        {p.hearingDate  && <p className="text-xs text-muted-foreground mt-0.5">Hearing: {p.hearingDate}</p>}
                        {p.nextDate     && <p className="text-xs text-muted-foreground">Next date: {p.nextDate}</p>}
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
            <div className="p-5 rounded-2xl border border-border bg-background">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4">Activity Log</p>
              {c.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {c.activities.map((a) => (
                      <div key={a.id} className="flex gap-4 relative">
                        <div className="w-7 h-7 rounded-full bg-background border-2 border-brand-blue/30 flex items-center justify-center shrink-0 z-10">
                          <Clock className="w-3 h-3 text-brand-blue/60" />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {ACTIVITY_LABELS[a.activityType] ?? a.activityType}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
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
    </motion.div>
  );
}
