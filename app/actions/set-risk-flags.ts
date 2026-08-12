"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { caseReferrals, auditLog, riskFlagEnum } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import caseEvents from "@/lib/case-events";

type RiskFlag = (typeof riskFlagEnum.enumValues)[number];
const RISK_FLAGS = new Set<string>(riskFlagEnum.enumValues);

// FR-M1-017 — set or clear risk flags with a mandatory note when non-empty.
export async function setRiskFlags(input: {
  caseId: string;
  version: number;
  flags: RiskFlag[];
  note: string | null;
  reason?: string;
}) {
  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, input.caseId));
  if (!current) throw new Error("Referral not found");
  const user = await assertCan("set_risk_flag", { ownedByUserId: current.assignedOfficerId });
  if (current.version !== input.version) throw new Error("STALE_RECORD");

  const flags = Array.from(new Set(input.flags.filter((f) => RISK_FLAGS.has(f))));
  if (flags.length > 0) {
    if (!input.note || input.note.trim().length < 10) {
      throw new Error("Explain the risk you are flagging (10 chars minimum).");
    }
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(caseReferrals)
      .set({
        riskFlags: flags.length ? flags : null,
        riskNote: flags.length ? input.note : null,
        lastActivityAt: now,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${caseReferrals.version} + 1`,
      })
      .where(
        and(eq(caseReferrals.id, input.caseId), eq(caseReferrals.version, input.version)),
      )
      .returning({ id: caseReferrals.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(auditLog).values({
      entity: "case_referrals",
      entityId: input.caseId,
      action: "set_risk_flags",
      actorId: user.id,
      field: "risk_flags",
      oldValue: JSON.stringify(current.riskFlags ?? []),
      newValue: JSON.stringify(flags),
      reason: input.reason ?? null,
    });
  });

  revalidatePath(`/cases/${input.caseId}`);
  caseEvents.emit("cases:updated");
}
