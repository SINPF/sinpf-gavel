"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, AlertCircle, Pencil, Save, X, Download } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { Badge, STATUS_LABELS, type BadgeStatus } from "@/components/ui/Badge";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import type { ReferralDetail } from "@/db/types";
import { correctReferral } from "@/app/actions/correct-referral";
import { CaseActions, type OfficerOption, type Permissions } from "./case-actions";
import type { AvailableTransition } from "@/lib/available-transitions";

const TYPE_LABELS: Record<string, string> = {
  unpaid_contribution: "Contribution",
  unpaid_surcharge:    "Surcharge",
  wages_record:        "Wages record",
};

const ACTION_LABELS: Record<string, string> = {
  demand_letter_issued: "Demand letter issued",
  notice_served:        "Notice served",
  employer_meeting:     "Employer meeting",
  phone_follow_up:      "Phone follow-up",
  site_visit:           "Site visit",
  affidavit_prepared:   "Affidavit prepared",
  court_appearance:     "Court appearance",
  deed_executed:        "Deed executed",
  other:                "Other",
};

const RISK_LABELS: Record<string, string> = {
  no_longer_operating: "No longer operating",
  statute_barred:      "Statute barred",
  untraceable:         "Untraceable",
  in_liquidation:      "In liquidation",
  other:               "Other",
};

function fmtDate(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? parse(v, "yyyy-MM-dd", new Date()) : v;
  return isValid(d) ? format(d, "d MMM yyyy") : String(v);
}
function fmtDateTime(v: string | Date | null | undefined) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return isValid(d) ? format(d, "d MMM yyyy · HH:mm") : String(v);
}
function fmtSbd(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return "SBD " + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function CorrectPanel({
  referral,
  onClose,
}: {
  referral: ReferralDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [contribution, setContribution] = useState<number | "">(
    referral.contributionAmount ? Number(referral.contributionAmount) : "",
  );
  const [surcharge, setSurcharge] = useState<number | "">(
    referral.surchargeAmount ? Number(referral.surchargeAmount) : "",
  );
  const [wagesPeriods, setWagesPeriods] = useState(referral.wagesPeriods ?? "");
  const [from, setFrom] = useState(referral.periodOfDefaultFrom ?? "");
  const [to, setTo] = useState(referral.periodOfDefaultTo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (reason.trim().length < 10) {
      setError("Give a reason for this correction (10 characters minimum).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await correctReferral({
        id: referral.id,
        version: referral.version,
        contributionAmount: contribution === "" ? null : Number(contribution),
        surchargeAmount: surcharge === "" ? null : Number(surcharge),
        wagesPeriods: wagesPeriods.trim() || null,
        periodOfDefaultFrom: from || null,
        periodOfDefaultTo: to || null,
        reason: reason.trim(),
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save correction.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";

  return (
    <div className="bg-card border border-primary/30 rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-foreground">Correct referral</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Contribution amount (SBD)
          </label>
          <AmountInput
            value={contribution}
            onChange={(e) => setContribution(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Surcharge amount (SBD)
          </label>
          <AmountInput
            value={surcharge}
            onChange={(e) => setSurcharge(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Period of default — from
          </label>
          <DateField value={from} onChange={setFrom} placeholder="Start…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Period of default — to
          </label>
          <DateField value={to} onChange={setTo} placeholder="End…" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">Wage periods</label>
          <input
            value={wagesPeriods}
            onChange={(e) => setWagesPeriods(e.target.value)}
            className={inputCls}
            placeholder="e.g. Jan–Jun 2026"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Reason for correction (required) <span className="text-destructive">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputCls} min-h-24 resize-y`}
            placeholder="What is being corrected and why?"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {submitting ? "Saving…" : "Save correction"}
        </button>
      </div>
    </div>
  );
}

export default function CaseDetailClient({
  referral,
  transitions,
  officers,
  permissions,
}: {
  referral: ReferralDetail;
  transitions: AvailableTransition[];
  officers: OfficerOption[];
  permissions: Permissions;
  currentUserId: string | null;
}) {
  const [correcting, setCorrecting] = useState(false);
  const isTerminal = ["closed", "withdrawn", "not_filed"].includes(referral.status);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to cases
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Referral
          </p>
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight tabular-nums">
            {referral.referralRef}
          </h1>
          <p className="mt-1 text-lg text-foreground">
            {referral.employerName}{" "}
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {referral.employerCode}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={referral.status as BadgeStatus} solid />
          {!referral.isIntakeComplete && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-semibold bg-warning/10 text-warning"
              title="Intake incomplete — missing checklist items"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Intake incomplete
            </span>
          )}
          {!isTerminal && permissions.correct && (
            <button
              onClick={() => setCorrecting((c) => !c)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Correct
            </button>
          )}
        </div>
      </div>

      {correcting && (
        <CorrectPanel referral={referral} onClose={() => setCorrecting(false)} />
      )}

      <CaseActions
        referral={referral}
        transitions={transitions}
        officers={officers}
        permissions={permissions}
      />

      {/* Money summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Total claimed
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            {fmtSbd(referral.totalClaimed)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Paid to date
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
            {fmtSbd(referral.paidToDate)}
          </p>
        </div>
        <div className="rounded-md border border-primary/30 bg-blue-50 p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Outstanding
          </p>
          <p className="mt-2 text-2xl font-bold text-primary tabular-nums">
            {fmtSbd(referral.outstanding)}
          </p>
        </div>
      </div>

      {/* Overview grid */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Reference">{referral.referralRef}</Field>
          <Field label="Status">{STATUS_LABELS[referral.status as BadgeStatus] ?? referral.status}</Field>
          <Field label="Types">
            <span className="flex flex-wrap gap-1">
              {referral.types.map((t) => (
                <span
                  key={t}
                  className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold border border-border text-foreground"
                >
                  {TYPE_LABELS[t] ?? t}
                </span>
              ))}
            </span>
          </Field>
          <Field label="Referral date">{fmtDate(referral.referralDate)}</Field>
          <Field label="Date received">{fmtDate(referral.dateReceived)}</Field>
          <Field label="Assigned officer">
            {referral.assigneeName ? (
              <>
                {referral.assigneeName}
                <span className="ml-1 text-xs text-muted-foreground">{referral.assigneeEmail}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </Field>
          <Field label="Contribution claimed">{fmtSbd(referral.contributionAmount)}</Field>
          <Field label="Surcharge claimed">{fmtSbd(referral.surchargeAmount)}</Field>
          <Field label="Wage periods">{referral.wagesPeriods ?? "—"}</Field>
          <Field label="Period of default">
            {referral.periodOfDefaultFrom || referral.periodOfDefaultTo ? (
              <>
                {fmtDate(referral.periodOfDefaultFrom)} → {fmtDate(referral.periodOfDefaultTo)}
              </>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Court venue">{referral.courtVenue ?? "—"}</Field>
          <Field label="Court case number">{referral.courtCaseNumber ?? "—"}</Field>
          <Field label="Date filed">{fmtDate(referral.dateFiled)}</Field>
          <Field label="Next court date">{fmtDate(referral.nextCourtDate)}</Field>
          <Field label="Response due">{fmtDate(referral.responseDueDate)}</Field>
          <Field label="Risk flags">
            {referral.riskFlags?.length ? (
              <span className="flex flex-wrap gap-1">
                {referral.riskFlags.map((f) => (
                  <span
                    key={f}
                    className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold bg-destructive/10 text-destructive"
                  >
                    {RISK_LABELS[f] ?? f}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Outcome">{referral.outcome ?? "—"}</Field>
          <Field label="Closed at">{fmtDate(referral.closedAt)}</Field>
        </div>
        {referral.riskNote && (
          <div className="mt-4 p-3 rounded-md bg-destructive/5 border border-destructive/20">
            <p className="text-[11px] font-semibold text-destructive uppercase tracking-[0.06em]">
              Risk note
            </p>
            <p className="mt-1 text-sm text-foreground">{referral.riskNote}</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold text-foreground">Documents</h2>
          <span className="text-xs text-muted-foreground">{referral.documents.length} file(s)</span>
        </div>
        {referral.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {referral.documents.map((d) => (
              <li key={d.id} className="py-3 flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">
                    {d.fileName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {d.documentType} · {fmtDateTime(d.uploadedAt)}
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status history */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Status history</h2>
        {referral.statusHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status changes yet.</p>
        ) : (
          <ul className="space-y-3">
            {referral.statusHistory.map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-primary" />
                <span className="flex-1 min-w-0">
                  <span className="block text-foreground">
                    {h.fromStatus ? (
                      <>
                        {STATUS_LABELS[h.fromStatus as BadgeStatus] ?? h.fromStatus}{" "}
                        →{" "}
                        <span className="font-semibold">
                          {STATUS_LABELS[h.toStatus as BadgeStatus] ?? h.toStatus}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold">Referral created</span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {fmtDateTime(h.changedAt)}
                    {h.changedByName ? ` · by ${h.changedByName}` : ""}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Actions</h2>
        {referral.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions recorded.</p>
        ) : (
          <ul className="space-y-3">
            {referral.actions.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="font-semibold text-foreground">
                  {ACTION_LABELS[a.actionType] ?? a.actionType}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(a.actionDate)}
                  {a.performerName ? ` · by ${a.performerName}` : ""}
                </p>
                <p className="mt-1 text-foreground">{a.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payments */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Payments</h2>
        {referral.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium text-right">Contribution</th>
                <th className="py-2 font-medium text-right">Surcharge</th>
                <th className="py-2 font-medium">Receipt</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {referral.payments.map((p) => (
                <tr key={p.id} className={p.isReversed ? "text-muted-foreground line-through" : ""}>
                  <td className="py-2 tabular-nums">{fmtDate(p.paymentDate)}</td>
                  <td className="py-2 tabular-nums text-right">{fmtSbd(p.amountContribution)}</td>
                  <td className="py-2 tabular-nums text-right">{fmtSbd(p.amountSurcharge)}</td>
                  <td className="py-2 text-xs">{p.receiptReference ?? "—"}</td>
                  <td className="py-2 text-xs">
                    {p.isReversed ? (
                      <span className="text-destructive font-semibold">Reversed</span>
                    ) : (
                      "Active"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
