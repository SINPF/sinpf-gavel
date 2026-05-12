"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Gavel, HandshakeIcon, ScrollText,
  CheckCircle2, Clock, ChevronRight, Plus, X,
} from "lucide-react";
import Link from "next/link";
import type { CaseDetail } from "@/db/types";
import { updateCaseStage, type CaseStage } from "@/app/actions/update-case-stage";
import { addCaseProceeding } from "@/app/actions/add-case-proceeding";
import { closeCase } from "@/app/actions/close-case";
import { addCaseActivity } from "@/app/actions/add-case-activity";

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
};

// ─── Stage Stepper ────────────────────────────────────────────────────────────

function StageStepper({ status, caseId }: { status: string; caseId?: string }) {
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const router = useRouter();
  const currentIdx = STAGE_ORDER.indexOf(status as CaseStage);
  const isClosed = status === "closed";

  const handleClick = async (key: CaseStage) => {
    if (!caseId || key === status || key === "closed" || isClosed || loadingStage) return;
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
        const isClickable = caseId && key !== status && key !== "closed" && !isClosed && !loadingStage;
        return (
          <div key={key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleClick(key)}
                disabled={!isClickable}
                title={isClickable ? `Move to ${label}` : undefined}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone   ? "bg-emerald-500 border-emerald-500 text-white" :
                  isActive ? "bg-brand-blue border-brand-blue text-white shadow-md shadow-brand-blue/30" :
                             "bg-background border-border text-muted-foreground"
                } ${isClickable ? "cursor-pointer hover:scale-110 hover:shadow-lg" : "cursor-default"}`}
              >
                {isLoading
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : isDone ? <CheckCircle2 className="w-4 h-4" /> : icon}
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                isActive ? "text-brand-blue" : isDone ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`w-12 h-0.5 mb-5 mx-1 ${i < currentIdx ? "bg-emerald-500" : "bg-border"}`} />
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
      { label: "Issue Demand Letter", stage: "demand_issued", optional: true },
      { label: "Enter Negotiation",   stage: "negotiation",   optional: true },
      { label: "File for Prosecution",stage: "prosecution" },
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
          <button onClick={() => setShowNote(false)} className="p-2 rounded-xl hover:bg-muted transition-all">
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
          <select name="proceedingType" required className={inputCls}>
            {["trial","hearing","mention","consent_order","default_judgment","enforcement","discontinued"].map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Court</label>
          <select name="court" required className={inputCls}>
            <option value="high_court">High Court</option>
            <option value="magistrates_court">Magistrates Court</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Hearing Date</label>
          <input type="date" name="hearingDate" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Next Date</label>
          <input type="date" name="nextDate" className={inputCls} />
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
          <select name="closureType" required className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="prosecution_completed">Prosecution Completed</option>
            <option value="settlement_completed">Settlement Completed</option>
            <option value="other">Other</option>
          </select>
        </div>
        {type === "other" && (
          <div>
            <label className={labelCls}>Reason</label>
            <select name="closureReason" className={inputCls}>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CaseDetailClient({ caseDetail: c }: { caseDetail: CaseDetail }) {
  const [showProceedingForm, setShowProceedingForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const isClosed = c.status === "closed";

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/cases" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{c.employerName}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{c.employerCode}</span>
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
              onClick={() => setShowCloseForm(!showCloseForm)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all"
            >
              Close Case
            </button>
          )}
        </div>
      </div>

      {/* Stage stepper */}
      <div className="p-6 rounded-2xl border border-border bg-background overflow-x-auto">
        <StageStepper status={c.status} caseId={c.id} />
      </div>

      {/* Close case form */}
      {showCloseForm && (
        <CloseCaseForm caseId={c.id} onDone={() => setShowCloseForm(false)} />
      )}

      {/* Stage actions */}
      {!isClosed && (
        <div className="p-5 rounded-2xl border border-border bg-background">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-3">Next Actions</p>
          <StageActions caseId={c.id} status={c.status} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: financial summary + types */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-background space-y-4">
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Financial Summary</p>
            {[
              ["Contributions", c.totalContributions],
              ["Surcharges",    c.totalSurcharges],
              ["Wages Record",  c.wagesRecord],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums">
                  {Number(val).toLocaleString("en-SB", { style: "currency", currency: "SBD" })}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-border flex justify-between">
              <span className="text-sm font-bold">Grand Total</span>
              <span className="text-sm font-black text-brand-blue tabular-nums">
                {Number(c.grandTotalClaim).toLocaleString("en-SB", { style: "currency", currency: "SBD" })}
              </span>
            </div>
          </div>

          {c.types.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-background">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-3">Case Types</p>
              <div className="flex flex-wrap gap-2">
                {c.types.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold">
                    {t.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                  </span>
                ))}
              </div>
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

        {/* Right: proceedings + activity log */}
        <div className="lg:col-span-2 space-y-4">
          {/* Proceedings */}
          <div className="p-5 rounded-2xl border border-border bg-background">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Court Proceedings</p>
              {!isClosed && c.status === "prosecution" && (
                <button
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
                      {p.hearingDate && <p className="text-xs text-muted-foreground mt-0.5">Hearing: {p.hearingDate}</p>}
                      {p.nextDate    && <p className="text-xs text-muted-foreground">Next date: {p.nextDate}</p>}
                      {p.outcomeNotes && <p className="text-sm text-foreground/80 mt-1">{p.outcomeNotes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity log */}
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
                            {new Date(a.createdAt).toLocaleString()}
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
        </div>
      </div>
    </div>
  );
}
