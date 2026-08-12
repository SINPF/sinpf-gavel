"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  casePayments,
  settlementSchedule,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { paidToDate as computePaid } from "@/lib/case-money";
import caseEvents from "@/lib/case-events";

// FR-M1-010 — record a payment split between contribution and surcharge.
// Refuses on wages-only cases (VR-M1-26). Warns on overpayment (VR-M1-25)
// unless the caller passes acknowledgeOverpayment: true.
export async function recordPayment(input: {
  caseId: string;
  paymentDate: string; // yyyy-MM-dd
  amountContribution: number;
  amountSurcharge: number;
  receiptReference?: string | null;
  scheduleId?: string | null;
  notes?: string | null;
  acknowledgeOverpayment?: boolean;
}) {
  const [current] = await db
    .select({
      id: caseReferrals.id,
      status: caseReferrals.status,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      totalClaimed: caseReferrals.totalClaimed,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.caseId));
  if (!current) throw new Error("Referral not found");
  const user = await assertCan("record_payment", { ownedByUserId: current.assignedOfficerId });

  if (["closed", "withdrawn", "not_filed"].includes(current.status)) {
    throw new Error("This case is closed. Reopen it before recording payments.");
  }

  // VR-M1-26: wages-only case has no monetary claim.
  const types = await db
    .select({ caseType: caseReferralTypes.caseType })
    .from(caseReferralTypes)
    .where(eq(caseReferralTypes.caseReferralId, input.caseId));
  const hasMonetary = types.some(
    (t) => t.caseType === "unpaid_contribution" || t.caseType === "unpaid_surcharge",
  );
  if (!hasMonetary) {
    throw new Error("This case has no monetary claim. Add the relevant case type first.");
  }

  const c = Number(input.amountContribution || 0);
  const s = Number(input.amountSurcharge || 0);
  if (c < 0 || s < 0) throw new Error("Payment amounts must be non-negative.");
  if (c + s <= 0) throw new Error("Enter a contribution or surcharge amount greater than zero.");
  if (new Date(input.paymentDate) > new Date()) {
    throw new Error("The payment date cannot be in the future.");
  }

  // VR-M1-25 — overpayment warning.
  const currentPaid = await computePaid(input.caseId);
  const claimed = Number(current.totalClaimed ?? 0);
  const newPaid = currentPaid + c + s;
  const overpays = newPaid > claimed;
  if (overpays && !input.acknowledgeOverpayment) {
    throw new Error(
      `OVERPAYMENT: total paid would be SBD ${newPaid.toFixed(2)} versus claimed SBD ${claimed.toFixed(2)}. Confirm to continue.`,
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(casePayments)
      .values({
        caseReferralId: input.caseId,
        paymentDate: input.paymentDate,
        amountContribution: String(c),
        amountSurcharge: String(s),
        receiptReference: input.receiptReference ?? null,
        scheduleId: input.scheduleId ?? null,
        notes: input.notes ?? null,
        recordedBy: user.id,
      })
      .returning({ id: casePayments.id });

    if (input.scheduleId) {
      await tx
        .update(settlementSchedule)
        .set({ state: "met" })
        .where(eq(settlementSchedule.id, input.scheduleId));
    }

    await tx
      .update(caseReferrals)
      .set({ lastActivityAt: now, updatedBy: user.id, updatedAt: now })
      .where(eq(caseReferrals.id, input.caseId));

    await tx.insert(auditLog).values({
      entity: "case_payments",
      entityId: inserted.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({ c, s, date: input.paymentDate, receipt: input.receiptReference ?? null }),
    });
  });

  revalidatePath(`/cases/${input.caseId}`);
  caseEvents.emit("cases:updated");
}

// FR-M1-010 + BR-M1-09 — reverse a payment with reason. MLS-only.
export async function reversePayment(input: {
  paymentId: string;
  reason: string;
}) {
  const user = await assertCan("reverse_payment");
  if (input.reason.trim().length < 10) {
    throw new Error("Give a reason (10 chars minimum) for reversing this payment.");
  }
  const [pmt] = await db
    .select()
    .from(casePayments)
    .where(eq(casePayments.id, input.paymentId));
  if (!pmt) throw new Error("Payment not found");
  if (pmt.isReversed) throw new Error("Payment is already reversed.");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(casePayments)
      .set({
        isReversed: true,
        reversalReason: input.reason,
        reversedBy: user.id,
        reversedAt: now,
      })
      .where(eq(casePayments.id, input.paymentId));

    // Un-mark any schedule instalment the payment was linked to.
    if (pmt.scheduleId) {
      await tx
        .update(settlementSchedule)
        .set({ state: "due" })
        .where(eq(settlementSchedule.id, pmt.scheduleId));
    }

    await tx
      .update(caseReferrals)
      .set({ lastActivityAt: now, updatedBy: user.id, updatedAt: now })
      .where(eq(caseReferrals.id, pmt.caseReferralId));

    await tx.insert(auditLog).values({
      entity: "case_payments",
      entityId: input.paymentId,
      action: "reverse",
      actorId: user.id,
      reason: input.reason,
    });
  });

  revalidatePath(`/cases/${pmt.caseReferralId}`);
  caseEvents.emit("cases:updated");
}
