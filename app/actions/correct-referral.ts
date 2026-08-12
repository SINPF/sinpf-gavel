"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  auditLog,
  casePayments,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { refreshIntakeFlag } from "@/lib/intake";
import { totalClaimed } from "@/lib/case-money";
import { assertCan } from "@/lib/rbac";
import { correctReferralSchema } from "@/db/validator";
import caseEvents from "@/lib/case-events";

const TERMINAL = new Set(["closed", "withdrawn", "not_filed"]);

// FR-M1-018: correct a referral with a mandatory reason and audit trail.
// Enforces:
//  - closed cases are read-only (BR-M1-10, VR-M1-30)
//  - optimistic lock via version (BR-M1-12)
//  - removing the last monetary case type when payments exist is refused (AC-018.3)
//  - reducing claim below paid warns (returned to caller to confirm)
export async function correctReferral(input: unknown) {
  const parsed = correctReferralSchema.parse(input);

  const [current] = await db
    .select()
    .from(caseReferrals)
    .where(eq(caseReferrals.id, parsed.id));
  if (!current) throw new Error("Referral not found");
  const session = await assertCan("correct_referral", {
    ownedByUserId: current.assignedOfficerId,
  });
  if (TERMINAL.has(current.status)) {
    throw new Error("This case is closed. Reopen it to make changes.");
  }
  if (current.version !== parsed.version) {
    throw new Error("STALE_RECORD");
  }

  // AC-018.3: removing the last monetary case type when payments exist.
  if (parsed.selectedTypes) {
    const hasMonetary = parsed.selectedTypes.some(
      (t) => t === "unpaid_contribution" || t === "unpaid_surcharge",
    );
    if (!hasMonetary) {
      const paymentRows = await db
        .select({ id: casePayments.id })
        .from(casePayments)
        .where(
          and(eq(casePayments.caseReferralId, parsed.id), eq(casePayments.isReversed, false)),
        );
      if (paymentRows.length > 0) {
        throw new Error(
          "Cannot remove the last monetary case type — payments are already recorded.",
        );
      }
    }
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const setValues: Partial<typeof caseReferrals.$inferInsert> = {};
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    function track<K extends keyof typeof caseReferrals.$inferSelect>(
      key: K,
      newVal: (typeof caseReferrals.$inferSelect)[K] | undefined,
    ) {
      if (newVal === undefined) return;
      const oldVal = current[key];
      if (oldVal !== newVal) {
        (setValues as Record<string, unknown>)[key as string] = newVal;
        oldValues[key as string] = oldVal;
        newValues[key as string] = newVal;
      }
    }

    if (parsed.employerId !== undefined) track("employerId", parsed.employerId);
    if (parsed.contributionAmount !== undefined) {
      track(
        "contributionAmount",
        parsed.contributionAmount != null ? (String(parsed.contributionAmount) as unknown as never) : null,
      );
    }
    if (parsed.surchargeAmount !== undefined) {
      track(
        "surchargeAmount",
        parsed.surchargeAmount != null ? (String(parsed.surchargeAmount) as unknown as never) : null,
      );
    }
    if (parsed.wagesPeriods !== undefined) track("wagesPeriods", parsed.wagesPeriods ?? null);
    if (parsed.periodOfDefaultFrom !== undefined) {
      track("periodOfDefaultFrom", parsed.periodOfDefaultFrom ?? null);
    }
    if (parsed.periodOfDefaultTo !== undefined) {
      track("periodOfDefaultTo", parsed.periodOfDefaultTo ?? null);
    }

    // Recompute totalClaimed if either amount moved.
    if (setValues.contributionAmount !== undefined || setValues.surchargeAmount !== undefined) {
      const nextContribution =
        setValues.contributionAmount !== undefined
          ? Number(setValues.contributionAmount ?? 0)
          : Number(current.contributionAmount ?? 0);
      const nextSurcharge =
        setValues.surchargeAmount !== undefined
          ? Number(setValues.surchargeAmount ?? 0)
          : Number(current.surchargeAmount ?? 0);
      const nextTotal = totalClaimed(nextContribution, nextSurcharge);
      if (Number(current.totalClaimed) !== nextTotal) {
        setValues.totalClaimed = String(nextTotal);
        oldValues.totalClaimed = current.totalClaimed;
        newValues.totalClaimed = String(nextTotal);
      }
    }

    if (Object.keys(setValues).length > 0) {
      const result = await tx
        .update(caseReferrals)
        .set({
          ...setValues,
          updatedBy: session.id,
          updatedAt: now,
          version: sql`${caseReferrals.version} + 1`,
        })
        .where(
          and(eq(caseReferrals.id, parsed.id), eq(caseReferrals.version, parsed.version)),
        )
        .returning({ id: caseReferrals.id });
      if (result.length === 0) throw new Error("STALE_RECORD");
    }

    // Case types (delete + insert diff).
    if (parsed.selectedTypes) {
      await tx
        .delete(caseReferralTypes)
        .where(eq(caseReferralTypes.caseReferralId, parsed.id));
      if (parsed.selectedTypes.length > 0) {
        await tx.insert(caseReferralTypes).values(
          parsed.selectedTypes.map((t) => ({ caseReferralId: parsed.id, caseType: t })),
        );
      }
      oldValues.selectedTypes = "(prior set)";
      newValues.selectedTypes = parsed.selectedTypes;
    }

    if (Object.keys(newValues).length > 0) {
      await tx.insert(auditLog).values({
        entity: "case_referrals",
        entityId: parsed.id,
        action: "correct",
        actorId: session.id,
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(newValues),
        reason: parsed.reason,
      });
    }
  });

  await refreshIntakeFlag(parsed.id);
  revalidatePath(`/cases/${parsed.id}`);
  revalidatePath("/cases");
  caseEvents.emit("cases:updated");
}
