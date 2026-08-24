"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import { Plus, RotateCcw, Calendar, Trash2 } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { AmountInput } from "@/components/ui/AmountInput";
import { recordPayment, reversePayment } from "@/app/actions/record-payment";
import {
  replaceSettlementSchedule,
  type ScheduleInstalment,
} from "@/app/actions/settlement-schedule";
import type { ReferralDetail } from "@/db/types";

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";

function fmtSbd(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return "SBD " + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "d MMM yyyy") : v;
}

export function PaymentsPanel({
  referral,
  canRecord,
  canReverse,
}: {
  referral: ReferralDetail;
  canRecord: boolean;
  canReverse: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [contribution, setContribution] = useState("");
  const [surcharge, setSurcharge] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [notes, setNotes] = useState("");
  const [ackOverpayment, setAckOverpayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    const c = Number(contribution || 0);
    const s = Number(surcharge || 0);
    if (c + s <= 0) {
      setError("Enter a contribution or surcharge amount greater than zero.");
      return;
    }
    setSubmitting(true);
    try {
      await recordPayment({
        caseId: referral.id,
        paymentDate,
        amountContribution: c,
        amountSurcharge: s,
        receiptReference: receiptReference || null,
        scheduleId: scheduleId || null,
        notes: notes || null,
        acknowledgeOverpayment: ackOverpayment,
      });
      setOpen(false);
      setContribution("");
      setSurcharge("");
      setReceiptReference("");
      setScheduleId("");
      setNotes("");
      setAckOverpayment(false);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      if (msg.startsWith("OVERPAYMENT:")) setAckOverpayment(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReverse(id: string) {
    const reason = prompt("Reason for reversing this payment (10 chars minimum)?");
    if (!reason || reason.trim().length < 10) return;
    try {
      await reversePayment({ paymentId: id, reason });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  const outstandingHint = Math.max(
    Number(referral.totalClaimed ?? 0) - referral.paidToDate,
    0,
  );

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">Payments</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          Outstanding: {fmtSbd(outstandingHint)}
        </span>
      </div>

      {canRecord && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mb-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Record payment
        </button>
      )}

      {canRecord && open && (
        <div className="mb-4 p-4 rounded-md border border-primary/30 bg-blue-50/50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Payment date</label>
              <DateField value={paymentDate} onChange={setPaymentDate} />
            </div>
            <div>
              <label className={labelCls}>Receipt reference (finance)</label>
              <input
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                className={inputCls}
                placeholder="e.g. RCPT-2026-00123"
              />
            </div>
            <div>
              <label className={labelCls}>Contribution amount (SBD)</label>
              <AmountInput
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Surcharge amount (SBD)</label>
              <AmountInput
                value={surcharge}
                onChange={(e) => setSurcharge(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            {referral.schedule.length > 0 && (
              <div className="md:col-span-2">
                <label className={labelCls}>Apply to instalment</label>
                <select
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Not linked to a schedule</option>
                  {referral.schedule.map((i) => (
                    <option key={i.id} value={i.id}>
                      Instalment {i.instalmentNo} · due {fmtDate(i.dueDate)} · {fmtSbd(i.amountDue)}{" "}
                      · {i.state}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className={labelCls}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} min-h-20`}
                placeholder="Any context about this payment."
              />
            </div>
          </div>

          {ackOverpayment && (
            <label className="flex items-start gap-2 text-sm text-warning">
              <input
                type="checkbox"
                checked={ackOverpayment}
                onChange={(e) => setAckOverpayment(e.target.checked)}
                className="mt-0.5"
              />
              I confirm this payment exceeds the amount claimed.
            </label>
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
              {submitting ? "Saving…" : "Record"}
            </button>
          </div>
        </div>
      )}

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
              <th className="py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {referral.payments.map((p) => (
              <tr
                key={p.id}
                className={p.isReversed ? "text-muted-foreground" : ""}
              >
                <td className="py-2 tabular-nums">{fmtDate(p.paymentDate)}</td>
                <td className={`py-2 tabular-nums text-right ${p.isReversed ? "line-through" : ""}`}>
                  {fmtSbd(p.amountContribution)}
                </td>
                <td className={`py-2 tabular-nums text-right ${p.isReversed ? "line-through" : ""}`}>
                  {fmtSbd(p.amountSurcharge)}
                </td>
                <td className="py-2 text-xs">{p.receiptReference ?? "—"}</td>
                <td className="py-2 text-xs">
                  {p.isReversed ? (
                    <span className="text-destructive font-semibold">Reversed</span>
                  ) : (
                    "Active"
                  )}
                </td>
                <td className="py-2 text-right">
                  {canReverse && !p.isReversed && (
                    <button
                      onClick={() => handleReverse(p.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Settlement schedule ──────────────────────────────────────────────────

type Draft = ScheduleInstalment & { key: string };

function newDraftRow(prev: Draft[]): Draft {
  const nextNo = (prev[prev.length - 1]?.instalmentNo ?? 0) + 1;
  return {
    key: String(Math.random()),
    instalmentNo: nextNo,
    dueDate: "",
    amountDue: 0,
  };
}

const STATE_STYLES: Record<string, string> = {
  due: "bg-muted text-muted-foreground",
  met: "bg-success/10 text-success",
  missed: "bg-destructive/10 text-destructive",
};

export function SettlementSchedulePanel({
  referral,
  canEdit,
  totalClaimed,
}: {
  referral: ReferralDetail;
  canEdit: boolean;
  totalClaimed: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    referral.schedule.length > 0
      ? referral.schedule.map((s) => ({
          key: s.id,
          instalmentNo: s.instalmentNo,
          dueDate: s.dueDate,
          amountDue: Number(s.amountDue),
        }))
      : [{ key: "new", instalmentNo: 1, dueDate: "", amountDue: 0 }],
  );
  const [agreedLesserSum, setAgreedLesserSum] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = drafts.reduce((s, d) => s + Number(d.amountDue || 0), 0);
  const totalDiffers = Math.abs(total - totalClaimed) > 0.005;

  async function submit() {
    setError(null);
    if (drafts.length === 0) {
      setError("Add at least one instalment.");
      return;
    }
    if (drafts.some((d) => !d.dueDate)) {
      setError("Give every instalment a due date.");
      return;
    }
    setSubmitting(true);
    try {
      await replaceSettlementSchedule({
        caseId: referral.id,
        instalments: drafts.map((d) => ({
          instalmentNo: d.instalmentNo,
          dueDate: d.dueDate,
          amountDue: d.amountDue,
        })),
        agreedLesserSum,
      });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">Settlement schedule</h2>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            {referral.schedule.length > 0 ? "Edit" : "Create"} schedule
          </button>
        )}
      </div>

      {!editing && referral.schedule.length === 0 && (
        <p className="text-sm text-muted-foreground">No deed schedule set.</p>
      )}

      {!editing && referral.schedule.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 font-medium">#</th>
              <th className="py-2 font-medium">Due</th>
              <th className="py-2 font-medium text-right">Amount</th>
              <th className="py-2 font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {referral.schedule.map((i) => (
              <tr key={i.id}>
                <td className="py-2 tabular-nums">{i.instalmentNo}</td>
                <td className="py-2 tabular-nums">{fmtDate(i.dueDate)}</td>
                <td className="py-2 tabular-nums text-right">{fmtSbd(i.amountDue)}</td>
                <td className="py-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-semibold uppercase ${
                      STATE_STYLES[i.state] ?? "bg-muted"
                    }`}
                  >
                    {i.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="space-y-3">
          {drafts.map((d, i) => (
            <div key={d.key} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">#</label>
                <input
                  type="number"
                  value={d.instalmentNo}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDrafts((cur) =>
                      cur.map((row, idx) => (idx === i ? { ...row, instalmentNo: v } : row)),
                    );
                  }}
                  className={inputCls}
                />
              </div>
              <div className="col-span-5">
                <label className="text-xs text-muted-foreground">Due date</label>
                <DateField
                  value={d.dueDate}
                  onChange={(v) =>
                    setDrafts((cur) =>
                      cur.map((row, idx) => (idx === i ? { ...row, dueDate: v } : row)),
                    )
                  }
                />
              </div>
              <div className="col-span-4">
                <label className="text-xs text-muted-foreground">Amount (SBD)</label>
                <AmountInput
                  value={d.amountDue || ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 0 : Number(e.target.value);
                    setDrafts((cur) =>
                      cur.map((row, idx) => (idx === i ? { ...row, amountDue: v } : row)),
                    );
                  }}
                  className={inputCls}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => setDrafts((cur) => cur.filter((_, idx) => idx !== i))}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-md"
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setDrafts((cur) => [...cur, newDraftRow(cur)])}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Add instalment
          </button>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total: <span className="tabular-nums font-semibold">{fmtSbd(total)}</span> ·
              Claimed: <span className="tabular-nums">{fmtSbd(totalClaimed)}</span>
            </span>
            {totalDiffers && total < totalClaimed && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreedLesserSum}
                  onChange={(e) => setAgreedLesserSum(e.target.checked)}
                />
                MLS-approved lesser sum
              </label>
            )}
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Save schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
