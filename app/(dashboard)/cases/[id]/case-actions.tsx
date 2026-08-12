"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, UserPlus, Flag, Zap, Gavel, X, Save, AlertTriangle } from "lucide-react";
import { STATUS_LABELS, type BadgeStatus } from "@/components/ui/Badge";
import { DateField } from "@/components/ui/DateField";
import { changeStatus, requestTerminal, reopenReferral, declinePendingDecision } from "@/app/actions/change-status";
import { assignReferral } from "@/app/actions/assign-referral";
import { recordAction } from "@/app/actions/record-action";
import { setRiskFlags } from "@/app/actions/set-risk-flags";
import type { ReferralDetail } from "@/db/types";
import type { AvailableTransition } from "@/lib/available-transitions";

export type OfficerOption = { id: string; name: string; email: string };

export type Permissions = {
  correct: boolean;
  assign: boolean;
  changeStatus: boolean;
  requestTerminal: boolean;
  closeReferral: boolean;
  reopenReferral: boolean;
  recordAction: boolean;
  setRiskFlag: boolean;
  uploadDocument: boolean;
};

const TERMINAL: BadgeStatus[] = ["closed", "withdrawn", "not_filed"];
const OUTCOMES = [
  { value: "paid_in_full", label: "Paid in full" },
  { value: "settled_by_deed", label: "Settled by deed" },
  { value: "partially_recovered", label: "Partially recovered" },
  { value: "wages_records_obtained", label: "Wages records obtained" },
  { value: "irrecoverable", label: "Irrecoverable" },
] as const;

const ACTION_TYPES = [
  { value: "demand_letter_issued", label: "Demand letter issued" },
  { value: "notice_served", label: "Notice served" },
  { value: "employer_meeting", label: "Employer meeting" },
  { value: "phone_follow_up", label: "Phone follow-up" },
  { value: "site_visit", label: "Site visit" },
  { value: "affidavit_prepared", label: "Affidavit prepared" },
  { value: "court_appearance", label: "Court appearance" },
  { value: "deed_executed", label: "Deed executed" },
  { value: "other", label: "Other" },
] as const;

const RISK_FLAGS = [
  { value: "no_longer_operating", label: "No longer operating" },
  { value: "statute_barred", label: "Statute barred" },
  { value: "untraceable", label: "Untraceable" },
  { value: "in_liquidation", label: "In liquidation" },
  { value: "other", label: "Other" },
] as const;

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

// ─── Panels ─────────────────────────────────────────────────────────────────

function PendingDecisionStrip({
  referral,
  permissions,
}: {
  referral: ReferralDetail;
  permissions: Permissions;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  if (!referral.pendingDecision) return null;

  async function approve() {
    setApproving(true);
    try {
      await changeStatus({
        id: referral.id,
        version: referral.version,
        toStatus: referral.pendingDecision as "withdrawn",
        reason: referral.pendingDecisionReason ?? undefined,
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setApproving(false);
    }
  }
  async function decline() {
    const reason = prompt("Why are you declining this request? (10 chars minimum)");
    if (!reason || reason.trim().length < 10) return;
    try {
      await declinePendingDecision({ id: referral.id, version: referral.version, reason });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  const targetLabel: Record<string, string> = {
    close: "close",
    withdraw: "withdraw",
    not_file: "not file",
  };

  return (
    <div className="rounded-md border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Officer request pending: {targetLabel[referral.pendingDecision] ?? referral.pendingDecision}
          </p>
          {referral.pendingDecisionReason && (
            <p className="mt-1 text-sm text-foreground">{referral.pendingDecisionReason}</p>
          )}
          {permissions.closeReferral && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={approve}
                disabled={approving}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {approving ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={decline}
                className="px-3 py-1.5 rounded-md border border-border text-sm font-semibold text-foreground hover:border-destructive hover:text-destructive transition-colors"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPanel({
  referral,
  transitions,
  permissions,
}: {
  referral: ReferralDetail;
  transitions: AvailableTransition[];
  permissions: Permissions;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AvailableTransition | null>(null);
  const isTerminal = TERMINAL.includes(referral.status as BadgeStatus);

  if (isTerminal) {
    if (!permissions.reopenReferral) return null;
    return (
      <ReopenPanel referral={referral} />
    );
  }

  if (transitions.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Change status</h3>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button
            key={t.to}
            disabled={!t.allowed && !permissions.changeStatus}
            title={t.message ?? ""}
            onClick={() => setSelected(t)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors border ${
              t.allowed
                ? "border-primary text-primary hover:bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABELS[t.to]}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {selected && (
        <TransitionDialog
          referral={referral}
          transition={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            router.refresh();
          }}
          canClose={permissions.closeReferral}
          canRequestTerminal={permissions.requestTerminal}
        />
      )}
    </div>
  );
}

function ReopenPanel({ referral }: { referral: ReferralDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 10) {
      setError("Give a reason (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await reopenReferral({ id: referral.id, version: referral.version, reason });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Zap className="w-3.5 h-3.5" /> Reopen case
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Reopen this case</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputCls} min-h-24`}
            placeholder="Why are you reopening this case?"
          />
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {submitting ? "Reopening…" : "Reopen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TransitionDialog({
  referral,
  transition,
  onClose,
  onDone,
  canClose,
  canRequestTerminal,
}: {
  referral: ReferralDetail;
  transition: AvailableTransition;
  onClose: () => void;
  onDone: () => void;
  canClose: boolean;
  canRequestTerminal: boolean;
}) {
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<string>("");
  const [courtVenue, setCourtVenue] = useState<string>(referral.courtVenue ?? "");
  const [courtCaseNumber, setCourtCaseNumber] = useState<string>(referral.courtCaseNumber ?? "");
  const [dateFiled, setDateFiled] = useState<string>(referral.dateFiled ?? "");
  const [nextCourtDate, setNextCourtDate] = useState<string>(referral.nextCourtDate ?? "");
  const [responseDueDate, setResponseDueDate] = useState<string>(referral.responseDueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isTerminal = ["closed", "withdrawn", "not_filed"].includes(transition.to);
  const isClose = transition.to === "closed";
  const officerCanRequest = !canClose && isTerminal && canRequestTerminal;

  async function submit() {
    setError(null);
    if (transition.reasonRequired && reason.trim().length < 10) {
      setError("Give a reason (10 chars minimum) for this outcome.");
      return;
    }
    if (isClose && !outcome) {
      setError("Choose an outcome for this closure.");
      return;
    }
    setSubmitting(true);
    try {
      if (officerCanRequest) {
        await requestTerminal({
          id: referral.id,
          version: referral.version,
          decision:
            transition.to === "closed"
              ? "close"
              : transition.to === "withdrawn"
              ? "withdraw"
              : "not_file",
          reason,
        });
      } else {
        await changeStatus({
          id: referral.id,
          version: referral.version,
          toStatus: transition.to,
          reason: reason || undefined,
          outcome: (outcome || null) as never,
          courtVenue: courtVenue || null,
          courtCaseNumber: courtCaseNumber || null,
          dateFiled: dateFiled || null,
          nextCourtDate: nextCourtDate || null,
          responseDueDate: responseDueDate || null,
        });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-md shadow-lg w-full max-w-lg border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Move to {STATUS_LABELS[transition.to]}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {officerCanRequest && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-foreground">
              This will send a request to MLS for approval. The status will not change until they
              decide.
            </div>
          )}
          {!transition.allowed && !isTerminal && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 text-sm text-foreground">
              {transition.message}
            </div>
          )}

          {transition.to === "in_court" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Court venue</label>
                <select
                  value={courtVenue}
                  onChange={(e) => setCourtVenue(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  <option value="magistrate_court">Magistrate court</option>
                  <option value="high_court">High court</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Court case number</label>
                <input
                  value={courtCaseNumber}
                  onChange={(e) => setCourtCaseNumber(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. CC-2026-0123"
                />
              </div>
              <div>
                <label className={labelCls}>Date filed</label>
                <DateField value={dateFiled} onChange={setDateFiled} />
              </div>
              <div>
                <label className={labelCls}>Next court date (optional)</label>
                <DateField value={nextCourtDate} onChange={setNextCourtDate} />
              </div>
            </div>
          )}

          {transition.to === "notice_served" && (
            <div>
              <label className={labelCls}>Response due date (optional)</label>
              <DateField value={responseDueDate} onChange={setResponseDueDate} />
            </div>
          )}

          {isClose && (
            <div>
              <label className={labelCls}>Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className={inputCls}
              >
                <option value="">Select outcome…</option>
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(transition.reasonRequired || officerCanRequest) && (
            <div>
              <label className={labelCls}>
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${inputCls} min-h-24`}
                placeholder="Explain why."
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving…" : officerCanRequest ? "Send request" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignmentPanel({
  referral,
  officers,
}: {
  referral: ReferralDetail;
  officers: OfficerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [officerId, setOfficerId] = useState(referral.assignedOfficerId ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isReassign = !!referral.assignedOfficerId && referral.assignedOfficerId !== officerId;

  async function submit() {
    setError(null);
    if (!officerId) {
      setError("Choose an officer.");
      return;
    }
    if (isReassign && reason.trim().length < 10) {
      setError("Give a reason (10 chars minimum) for the reassignment.");
      return;
    }
    setSubmitting(true);
    try {
      await assignReferral({
        id: referral.id,
        version: referral.version,
        officerId,
        reason: isReassign ? reason : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Assignment</h3>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {referral.assignedOfficerId ? "Reassign officer" : "Assign officer"}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Officer</label>
            <select
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select an officer…</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.email}
                </option>
              ))}
            </select>
          </div>
          {isReassign && (
            <div>
              <label className={labelCls}>
                Reason for reassignment <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${inputCls} min-h-20`}
                placeholder="Why is this case being reassigned?"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordActionPanel({ referral }: { referral: ReferralDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("phone_follow_up");
  const [actionDate, setActionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (notes.trim().length < 10) {
      setError("Describe what was done (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await recordAction({
        caseId: referral.id,
        actionType: actionType as never,
        actionDate,
        notes,
      });
      setOpen(false);
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Record action</h3>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Gavel className="w-3.5 h-3.5" /> Record action
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Action type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className={inputCls}
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Action date</label>
              <DateField value={actionDate} onChange={setActionDate} />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              Notes <span className="text-destructive">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} min-h-24`}
              placeholder="What was done and the result."
            />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskFlagsPanel({ referral }: { referral: ReferralDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<string[]>((referral.riskFlags as string[]) ?? []);
  const [note, setNote] = useState(referral.riskNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(v: string) {
    setFlags((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  async function submit() {
    setError(null);
    if (flags.length > 0 && note.trim().length < 10) {
      setError("Explain the risk (10 chars minimum).");
      return;
    }
    setSubmitting(true);
    try {
      await setRiskFlags({
        caseId: referral.id,
        version: referral.version,
        flags: flags as never,
        note: flags.length ? note : null,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h3 className="font-serif text-lg font-semibold text-foreground mb-3">Risk flags</h3>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Flag className="w-3.5 h-3.5" /> Manage flags
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {RISK_FLAGS.map((f) => {
              const active = flags.includes(f.value);
              return (
                <button
                  key={f.value}
                  onClick={() => toggle(f.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
                    active
                      ? "bg-destructive/10 border-destructive text-destructive"
                      : "border-border text-foreground hover:border-destructive/50"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          {flags.length > 0 && (
            <div>
              <label className={labelCls}>
                Risk note <span className="text-destructive">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${inputCls} min-h-20`}
                placeholder="Explain the risk you are flagging."
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Public ────────────────────────────────────────────────────────────────

export function CaseActions({
  referral,
  transitions,
  officers,
  permissions,
}: {
  referral: ReferralDetail;
  transitions: AvailableTransition[];
  officers: OfficerOption[];
  permissions: Permissions;
}) {
  return (
    <div className="space-y-4">
      <PendingDecisionStrip referral={referral} permissions={permissions} />
      {permissions.changeStatus && (
        <StatusPanel referral={referral} transitions={transitions} permissions={permissions} />
      )}
      {permissions.reopenReferral && TERMINAL.includes(referral.status as BadgeStatus) && (
        <ReopenPanel referral={referral} />
      )}
      {permissions.assign && <AssignmentPanel referral={referral} officers={officers} />}
      {permissions.recordAction && <RecordActionPanel referral={referral} />}
      {permissions.setRiskFlag && <RiskFlagsPanel referral={referral} />}
    </div>
  );
}
