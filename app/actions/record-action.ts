"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  referralAction,
  auditLog,
  actionTypeEnum,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import caseEvents from "@/lib/case-events";

type ActionType = (typeof actionTypeEnum.enumValues)[number];
const ACTION_TYPES = new Set<string>(actionTypeEnum.enumValues);

// FR-M1-009 — record an action. Advances last_activity_at (BR-M1-07).
export async function recordAction(input: {
  caseId: string;
  actionType: ActionType;
  actionDate: string; // yyyy-MM-dd
  notes: string;
  documentId?: string | null;
}) {
  const [current] = await db
    .select({
      id: caseReferrals.id,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      status: caseReferrals.status,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.caseId));
  if (!current) throw new Error("Referral not found");
  const user = await assertCan("record_action", { ownedByUserId: current.assignedOfficerId });

  if (!ACTION_TYPES.has(input.actionType)) throw new Error("Unknown action type");
  if (!input.notes || input.notes.trim().length < 10) {
    throw new Error("Describe what was done and the result (10 chars minimum).");
  }
  if (new Date(input.actionDate) > new Date()) {
    throw new Error("The action date cannot be in the future.");
  }
  if (["closed", "withdrawn", "not_filed"].includes(current.status as string)) {
    throw new Error("This case is closed. Reopen it to record actions.");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(referralAction)
      .values({
        caseReferralId: input.caseId,
        actionType: input.actionType,
        actionDate: input.actionDate,
        notes: input.notes.trim(),
        documentId: input.documentId ?? null,
        performedBy: user.id,
      })
      .returning({ id: referralAction.id });

    await tx
      .update(caseReferrals)
      .set({ lastActivityAt: now, updatedBy: user.id, updatedAt: now })
      .where(eq(caseReferrals.id, input.caseId));

    await tx.insert(auditLog).values({
      entity: "referral_action",
      entityId: inserted.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({
        caseReferralId: input.caseId,
        actionType: input.actionType,
        actionDate: input.actionDate,
      }),
    });
  });

  revalidatePath(`/cases/${input.caseId}`);
  caseEvents.emit("cases:updated");
}
