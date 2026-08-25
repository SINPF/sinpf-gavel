"use server";

import { eq } from "drizzle-orm";
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

// Correct a payment entry. Same permission as record_payment. Recomputes
// the overpayment check using the *new* amounts. Logs old vs new to audit.
export async function editPayment(input: {
  paymentId: string;
  paymentDate: string; // yyyy-MM-dd
  amountContribution: number;
  amountSurcharge: number;
  receiptReference?: string | null;
  scheduleId?: string | null;
  notes?: string | null;
  acknowledgeOverpayment?: boolean;
}) {
  const [pmt] = await db
    .select()
    .from(casePayments)
    .where(eq(casePayments.id, input.paymentId));
  if (!pmt) throw new Error("Payment not found");
  if (pmt.isReversed) throw new Error("Cannot edit a reversed payment.");

  const [current] = await db
    .select({
      id: caseReferrals.id,
      status: caseReferrals.status,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      totalClaimed: caseReferrals.totalClaimed,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, pmt.caseReferralId));
  if (!current) throw new Error("Referral not found");
  const user = await assertCan("record_payment", { ownedByUserId: current.assignedOfficerId });

  if (["closed", "withdrawn", "not_filed"].includes(current.status)) {
    throw new Error("This case is closed. Reopen it before editing payments.");
  }

  const c = Number(input.amountContribution || 0);
  const s = Number(input.amountSurcharge || 0);
  if (c < 0 || s < 0) throw new Error("Payment amounts must be non-negative.");
  if (c + s <= 0) throw new Error("Enter a contribution or surcharge amount greater than zero.");
  if (new Date(input.paymentDate) > new Date()) {
    throw new Error("The payment date cannot be in the future.");
  }

  // Overpayment check with the swapped amounts.
  const currentPaid = await computePaid(pmt.caseReferralId);
  const oldContribution = Number(pmt.amountContribution);
  const oldSurcharge = Number(pmt.amountSurcharge);
  const claimed = Number(current.totalClaimed ?? 0);
  const newPaid = currentPaid - oldContribution - oldSurcharge + c + s;
  if (newPaid > claimed && !input.acknowledgeOverpayment) {
    throw new Error(
      `OVERPAYMENT: total paid would be SBD ${newPaid.toFixed(2)} versus claimed SBD ${claimed.toFixed(2)}. Confirm to continue.`,
    );
  }

  const oldSnapshot = {
    paymentDate: pmt.paymentDate,
    amountContribution: oldContribution,
    amountSurcharge: oldSurcharge,
    receiptReference: pmt.receiptReference,
    scheduleId: pmt.scheduleId,
    notes: pmt.notes,
  };
  const newSnapshot = {
    paymentDate: input.paymentDate,
    amountContribution: c,
    amountSurcharge: s,
    receiptReference: input.receiptReference ?? null,
    scheduleId: input.scheduleId ?? null,
    notes: input.notes ?? null,
  };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(casePayments)
      .set({
        paymentDate: input.paymentDate,
        amountContribution: String(c),
        amountSurcharge: String(s),
        receiptReference: input.receiptReference ?? null,
        scheduleId: input.scheduleId ?? null,
        notes: input.notes ?? null,
      })
      .where(eq(casePayments.id, input.paymentId));

    // If the payment was linked to a different (or now no) instalment, reset
    // the old one; the new one gets marked met.
    if (pmt.scheduleId && pmt.scheduleId !== (input.scheduleId ?? null)) {
      await tx
        .update(settlementSchedule)
        .set({ state: "due" })
        .where(eq(settlementSchedule.id, pmt.scheduleId));
    }
    if (input.scheduleId) {
      await tx
        .update(settlementSchedule)
        .set({ state: "met" })
        .where(eq(settlementSchedule.id, input.scheduleId));
    }

    await tx
      .update(caseReferrals)
      .set({ lastActivityAt: now, updatedBy: user.id, updatedAt: now })
      .where(eq(caseReferrals.id, pmt.caseReferralId));

    await tx.insert(auditLog).values({
      entity: "case_payments",
      entityId: input.paymentId,
      action: "update",
      actorId: user.id,
      oldValue: JSON.stringify(oldSnapshot),
      newValue: JSON.stringify(newSnapshot),
    });
  });

  revalidatePath(`/cases/${pmt.caseReferralId}`);
  caseEvents.emit("cases:updated");
}

// Delete a payment entry outright. Same permission as record_payment. Row is
// removed; the audit log keeps the full old value so the paper trail survives.
export async function deletePayment(input: { paymentId: string }) {
  const [pmt] = await db
    .select()
    .from(casePayments)
    .where(eq(casePayments.id, input.paymentId));
  if (!pmt) throw new Error("Payment not found");

  const [current] = await db
    .select({
      id: caseReferrals.id,
      status: caseReferrals.status,
      assignedOfficerId: caseReferrals.assignedOfficerId,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, pmt.caseReferralId));
  if (!current) throw new Error("Referral not found");
  const user = await assertCan("record_payment", { ownedByUserId: current.assignedOfficerId });

  if (["closed", "withdrawn", "not_filed"].includes(current.status)) {
    throw new Error("This case is closed. Reopen it before deleting payments.");
  }

  const snapshot = {
    paymentDate: pmt.paymentDate,
    amountContribution: Number(pmt.amountContribution),
    amountSurcharge: Number(pmt.amountSurcharge),
    receiptReference: pmt.receiptReference,
    scheduleId: pmt.scheduleId,
    notes: pmt.notes,
    isReversed: pmt.isReversed,
  };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(casePayments).where(eq(casePayments.id, input.paymentId));

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
      action: "delete",
      actorId: user.id,
      oldValue: JSON.stringify(snapshot),
    });
  });

  revalidatePath(`/cases/${pmt.caseReferralId}`);
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
