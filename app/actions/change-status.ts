"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  referralStatusHistory,
  auditLog,
  caseOutcomeEnum,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import caseEvents from "@/lib/case-events";
import { requireUser, assertCan } from "@/lib/rbac";
import {
  evaluateGuard,
  permittedTargets,
  reasonRequired,
  checkOutcomeConsistency,
  isTerminal,
  type Status,
} from "@/lib/status-machine";

type Outcome = (typeof caseOutcomeEnum.enumValues)[number];

export type ChangeStatusInput = {
  id: string;
  version: number;
  toStatus: Status;
  reason?: string;
  // Fields that transition guards may require:
  courtVenue?: string | null;
  courtCaseNumber?: string | null;
  dateFiled?: string | null;
  nextCourtDate?: string | null;
  responseDueDate?: string | null;
  outcome?: Outcome | null;
};

const OUTCOME_FOR_TERMINAL: Record<string, Outcome> = {
  withdrawn: "withdrawn",
  not_filed: "not_filed",
};

// FR-M1-006 / FR-M1-007 — controlled status transition.
export async function changeStatus(input: ChangeStatusInput) {
  const user = await requireUser();
  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.id));
  if (!current) throw new Error("Referral not found");

  await assertCan("change_status", { user, ownedByUserId: current.assignedOfficerId });

  if (current.version !== input.version) throw new Error("STALE_RECORD");

  const from = current.status as Status;
  const to = input.toStatus;
  if (!permittedTargets(from).includes(to)) {
    throw new Error(`INVALID_TRANSITION: cannot move ${from} → ${to}`);
  }

  if (reasonRequired(to) && (!input.reason || input.reason.trim().length < 10)) {
    throw new Error("REASON_REQUIRED: give a reason (10 chars minimum) for this outcome.");
  }

  // Closure requires MLS specifically (guard: can("close_referral"))
  if (isTerminal(to)) {
    await assertCan("close_referral", { user });
    if (to === "closed") {
      if (!input.outcome) {
        throw new Error("OUTCOME_REQUIRED: choose an outcome for this closure.");
      }
      const consistency = await checkOutcomeConsistency(input.id, input.outcome);
      if (!consistency.allowed) throw new Error(consistency.message);
    }
  }

  const guard = await evaluateGuard(input.id, to, {
    courtVenue: input.courtVenue,
    courtCaseNumber: input.courtCaseNumber,
    dateFiled: input.dateFiled,
    outcome: input.outcome,
  });
  if (!guard.allowed) throw new Error(`GUARD_NOT_MET: ${guard.message}`);

  const now = new Date();
  const setValues: Partial<typeof caseReferrals.$inferInsert> = {
    status: to,
    statusChangedAt: now,
    lastActivityAt: now,
    updatedBy: user.id,
    updatedAt: now,
    pendingDecision: null,
    pendingDecisionBy: null,
    pendingDecisionReason: null,
    pendingDecisionAt: null,
  };

  if (to === "in_court") {
    if (input.courtVenue !== undefined) setValues.courtVenue = input.courtVenue as never;
    if (input.courtCaseNumber !== undefined) setValues.courtCaseNumber = input.courtCaseNumber;
    if (input.dateFiled !== undefined) setValues.dateFiled = input.dateFiled ?? undefined;
    if (input.nextCourtDate !== undefined) setValues.nextCourtDate = input.nextCourtDate ?? undefined;
  }
  if (to === "notice_served" && input.responseDueDate !== undefined) {
    setValues.responseDueDate = input.responseDueDate ?? undefined;
  }

  if (isTerminal(to)) {
    setValues.closedAt = now.toISOString().slice(0, 10);
    setValues.nextCourtDate = null;
    setValues.responseDueDate = null;
    setValues.outcome =
      to === "closed" ? (input.outcome as Outcome) : OUTCOME_FOR_TERMINAL[to] ?? null;
    setValues.closureReason = input.reason ?? null;
  }

  await db.transaction(async (tx) => {
    const result = await tx
      .update(caseReferrals)
      .set({
        ...setValues,
        version: sql`${caseReferrals.version} + 1`,
      })
      .where(
        and(eq(caseReferrals.id, input.id), eq(caseReferrals.version, input.version)),
      )
      .returning({ id: caseReferrals.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(referralStatusHistory).values({
      caseReferralId: input.id,
      fromStatus: from,
      toStatus: to,
      reason: input.reason ?? null,
      changedBy: user.id,
      approvedBy: isTerminal(to) ? user.id : null,
    });

    await tx.insert(auditLog).values({
      entity: "case_referrals",
      entityId: input.id,
      action: "status_change",
      actorId: user.id,
      field: "status",
      oldValue: from,
      newValue: to,
      reason: input.reason ?? null,
    });
  });

  revalidatePath(`/cases/${input.id}`);
  revalidatePath("/cases");
  caseEvents.emit("cases:updated");
}

// FR-M1-013 — reopen a terminal case (MLS only).
export async function reopenReferral(input: { id: string; version: number; reason: string }) {
  const user = await assertCan("reopen_referral");
  if (input.reason.trim().length < 10) {
    throw new Error("REASON_REQUIRED: give a reason (10 chars minimum) for reopening.");
  }
  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.id));
  if (!current) throw new Error("Referral not found");
  if (!isTerminal(current.status as Status)) {
    throw new Error("Only terminal cases can be reopened.");
  }
  if (current.version !== input.version) throw new Error("STALE_RECORD");

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(caseReferrals)
      .set({
        status: "under_assessment",
        statusChangedAt: now,
        lastActivityAt: now,
        closedAt: null,
        outcome: null,
        closureReason: null,
        pendingDecision: null,
        pendingDecisionBy: null,
        pendingDecisionReason: null,
        pendingDecisionAt: null,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${caseReferrals.version} + 1`,
      })
      .where(
        and(eq(caseReferrals.id, input.id), eq(caseReferrals.version, input.version)),
      )
      .returning({ id: caseReferrals.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(referralStatusHistory).values({
      caseReferralId: input.id,
      fromStatus: current.status as Status,
      toStatus: "under_assessment",
      reason: input.reason,
      changedBy: user.id,
      approvedBy: user.id,
    });

    await tx.insert(auditLog).values({
      entity: "case_referrals",
      entityId: input.id,
      action: "reopen",
      actorId: user.id,
      field: "status",
      oldValue: current.status as string,
      newValue: "under_assessment",
      reason: input.reason,
    });
  });

  revalidatePath(`/cases/${input.id}`);
  revalidatePath("/cases");
  caseEvents.emit("cases:updated");
}

// FR-M1-012 — Legal Officer requests a terminal outcome; MLS decides.
export async function requestTerminal(input: {
  id: string;
  version: number;
  decision: "close" | "withdraw" | "not_file";
  reason: string;
}) {
  const user = await requireUser();
  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.id));
  if (!current) throw new Error("Referral not found");
  await assertCan("request_terminal", { user, ownedByUserId: current.assignedOfficerId });
  if (input.reason.trim().length < 10) {
    throw new Error("REASON_REQUIRED: give a reason (10 chars minimum) for this request.");
  }
  if (current.version !== input.version) throw new Error("STALE_RECORD");

  const now = new Date();
  const result = await db
    .update(caseReferrals)
    .set({
      pendingDecision: input.decision,
      pendingDecisionBy: user.id,
      pendingDecisionReason: input.reason,
      pendingDecisionAt: now,
      lastActivityAt: now,
      updatedBy: user.id,
      updatedAt: now,
      version: sql`${caseReferrals.version} + 1`,
    })
    .where(and(eq(caseReferrals.id, input.id), eq(caseReferrals.version, input.version)))
    .returning({ id: caseReferrals.id });
  if (result.length === 0) throw new Error("STALE_RECORD");

  await db.insert(auditLog).values({
    entity: "case_referrals",
    entityId: input.id,
    action: "request_terminal",
    actorId: user.id,
    newValue: input.decision,
    reason: input.reason,
  });

  revalidatePath(`/cases/${input.id}`);
  caseEvents.emit("cases:updated");
}

// FR-M1-012.4 — MLS declines a pending request.
export async function declinePendingDecision(input: { id: string; version: number; reason: string }) {
  const user = await assertCan("close_referral"); // MLS-only decision
  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.id));
  if (!current) throw new Error("Referral not found");
  if (current.version !== input.version) throw new Error("STALE_RECORD");
  if (!current.pendingDecision) throw new Error("No pending decision to decline.");

  const now = new Date();
  await db
    .update(caseReferrals)
    .set({
      pendingDecision: null,
      pendingDecisionBy: null,
      pendingDecisionReason: null,
      pendingDecisionAt: null,
      lastActivityAt: now,
      updatedBy: user.id,
      updatedAt: now,
      version: sql`${caseReferrals.version} + 1`,
    })
    .where(and(eq(caseReferrals.id, input.id), eq(caseReferrals.version, input.version)));

  await db.insert(auditLog).values({
    entity: "case_referrals",
    entityId: input.id,
    action: "decline_pending",
    actorId: user.id,
    reason: input.reason,
  });

  revalidatePath(`/cases/${input.id}`);
  caseEvents.emit("cases:updated");
}
