"use server";

import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { caseReferrals, userProfile, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import caseEvents from "@/lib/case-events";

// FR-M1-004 — assign or reassign. Reason mandatory on reassignment.
export async function assignReferral(input: {
  id: string;
  version: number;
  officerId: string;
  reason?: string;
}) {
  const user = await assertCan("assign_referral");
  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.id));
  if (!current) throw new Error("Referral not found");
  if (current.version !== input.version) throw new Error("STALE_RECORD");

  const isReassignment = !!current.assignedOfficerId && current.assignedOfficerId !== input.officerId;
  if (isReassignment && (!input.reason || input.reason.trim().length < 10)) {
    throw new Error("REASON_REQUIRED: give a reason (10 chars minimum) for the reassignment.");
  }

  // Only active Legal Officers are selectable (BR-M1-05).
  const [officer] = await db
    .select({ role: userProfile.role, isActive: userProfile.isActive })
    .from(userProfile)
    .where(eq(userProfile.userId, input.officerId));
  if (!officer || !officer.isActive || officer.role !== "legal_officer") {
    throw new Error("Select an active Legal Officer.");
  }

  const now = new Date();
  const result = await db
    .update(caseReferrals)
    .set({
      assignedOfficerId: input.officerId,
      assignedAt: now,
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
    action: isReassignment ? "reassign" : "assign",
    actorId: user.id,
    field: "assigned_officer_id",
    oldValue: current.assignedOfficerId ?? null,
    newValue: input.officerId,
    reason: input.reason ?? null,
  });

  revalidatePath(`/cases/${input.id}`);
  revalidatePath("/cases");
  caseEvents.emit("cases:updated");
}

// FR-M1-005 — bulk reassignment. All-or-nothing across eligible referrals.
export async function bulkAssignReferrals(input: {
  ids: string[];
  officerId: string;
  reason: string;
}) {
  const user = await assertCan("assign_referral");
  if (input.reason.trim().length < 10) {
    throw new Error("REASON_REQUIRED: give a reason (10 chars minimum) for the bulk reassignment.");
  }
  const [officer] = await db
    .select({ role: userProfile.role, isActive: userProfile.isActive })
    .from(userProfile)
    .where(eq(userProfile.userId, input.officerId));
  if (!officer || !officer.isActive || officer.role !== "legal_officer") {
    throw new Error("Select an active Legal Officer.");
  }

  const rows = await db
    .select({
      id: caseReferrals.id,
      status: caseReferrals.status,
      assignedOfficerId: caseReferrals.assignedOfficerId,
    })
    .from(caseReferrals)
    .where(inArray(caseReferrals.id, input.ids));

  const eligible = rows.filter(
    (r) => !["closed", "withdrawn", "not_filed"].includes(r.status as string),
  );
  const skipped = rows.filter((r) => !eligible.some((e) => e.id === r.id));

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const r of eligible) {
      await tx
        .update(caseReferrals)
        .set({
          assignedOfficerId: input.officerId,
          assignedAt: now,
          lastActivityAt: now,
          updatedBy: user.id,
          updatedAt: now,
          version: sql`${caseReferrals.version} + 1`,
        })
        .where(eq(caseReferrals.id, r.id));

      await tx.insert(auditLog).values({
        entity: "case_referrals",
        entityId: r.id,
        action: "bulk_reassign",
        actorId: user.id,
        field: "assigned_officer_id",
        oldValue: r.assignedOfficerId ?? null,
        newValue: input.officerId,
        reason: input.reason,
      });
    }
  });

  revalidatePath("/cases");
  caseEvents.emit("cases:updated");
  return { assigned: eligible.length, skipped: skipped.length };
}
