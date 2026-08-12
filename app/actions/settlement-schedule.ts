"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  settlementSchedule,
  casePayments,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import caseEvents from "@/lib/case-events";

export type ScheduleInstalment = {
  instalmentNo: number;
  dueDate: string; // yyyy-MM-dd
  amountDue: number;
};

// FR-M1-023 — replace the case's deed instalment schedule.
// VR-M1-31 — total must equal total_claimed unless MLS approves a lesser sum.
// Legal Officers can create; MLS can approve less-than-claimed via
// `agreedLesserSum: true`.
export async function replaceSettlementSchedule(input: {
  caseId: string;
  instalments: ScheduleInstalment[];
  agreedLesserSum?: boolean;
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
  const user = await assertCan("record_action", { ownedByUserId: current.assignedOfficerId });

  if (["closed", "withdrawn", "not_filed"].includes(current.status)) {
    throw new Error("This case is closed. Reopen it before editing the schedule.");
  }

  // Sanity checks on rows.
  const seen = new Set<number>();
  for (const inst of input.instalments) {
    if (!Number.isFinite(inst.amountDue) || inst.amountDue <= 0) {
      throw new Error(`Instalment ${inst.instalmentNo} must be greater than zero.`);
    }
    if (seen.has(inst.instalmentNo)) {
      throw new Error(`Duplicate instalment number ${inst.instalmentNo}.`);
    }
    seen.add(inst.instalmentNo);
  }

  const total = input.instalments.reduce((sum, i) => sum + Number(i.amountDue), 0);
  const claimed = Number(current.totalClaimed ?? 0);
  if (Math.abs(total - claimed) > 0.005) {
    if (total < claimed && input.agreedLesserSum) {
      // MLS approval required for lesser sum.
      await assertCan("close_referral"); // MLS proxy — no dedicated permission slot
    } else {
      throw new Error(
        `Instalments total SBD ${total.toFixed(2)}, which does not match the claim of SBD ${claimed.toFixed(2)}.`,
      );
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(settlementSchedule).where(eq(settlementSchedule.caseReferralId, input.caseId));
    if (input.instalments.length > 0) {
      await tx.insert(settlementSchedule).values(
        input.instalments.map((i) => ({
          caseReferralId: input.caseId,
          instalmentNo: i.instalmentNo,
          dueDate: i.dueDate,
          amountDue: String(i.amountDue),
        })),
      );
    }
    await tx
      .update(caseReferrals)
      .set({ lastActivityAt: now, updatedBy: user.id, updatedAt: now })
      .where(eq(caseReferrals.id, input.caseId));

    await tx.insert(auditLog).values({
      entity: "case_referrals",
      entityId: input.caseId,
      action: "replace_settlement_schedule",
      actorId: user.id,
      newValue: JSON.stringify({ count: input.instalments.length, total }),
    });
  });

  await recomputeScheduleStates(input.caseId);
  revalidatePath(`/cases/${input.caseId}`);
  caseEvents.emit("cases:updated");
}

// Refresh met/missed on each instalment based on non-reversed payments
// linked to it, and mark past-due un-met instalments as missed. Used by the
// payment/reversal actions and the daily alert job.
export async function recomputeScheduleStates(caseId: string) {
  const rows = await db
    .select({ id: settlementSchedule.id, dueDate: settlementSchedule.dueDate })
    .from(settlementSchedule)
    .where(eq(settlementSchedule.caseReferralId, caseId));

  if (rows.length === 0) return;

  const met = await db
    .select({ scheduleId: casePayments.scheduleId })
    .from(casePayments)
    .where(
      and(
        eq(casePayments.caseReferralId, caseId),
        eq(casePayments.isReversed, false),
        inArray(casePayments.scheduleId, rows.map((r) => r.id)),
      ),
    );
  const metIds = new Set(met.map((m) => m.scheduleId).filter((v): v is string => !!v));

  const today = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    let state: "due" | "met" | "missed" = "due";
    if (metIds.has(r.id)) state = "met";
    else if (r.dueDate && r.dueDate < today) state = "missed";
    await db
      .update(settlementSchedule)
      .set({ state })
      .where(eq(settlementSchedule.id, r.id));
  }
}
