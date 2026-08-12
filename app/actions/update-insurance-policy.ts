"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { insurancePolicies, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { updateInsurancePolicySchema } from "@/db/insurance-validator";

// FR-M3-001 / editing — update policy details with an optimistic lock and a
// mandatory reason. Unlike contracts there is no terminated-lock: insurance
// policies simply expire.
export async function updateInsurancePolicy(input: unknown) {
  const parsed = updateInsurancePolicySchema.parse(input);
  const user = await assertCan("update_insurance_policy");

  const [current] = await db
    .select()
    .from(insurancePolicies)
    .where(eq(insurancePolicies.id, parsed.id));
  if (!current) throw new Error("Policy not found");
  if (current.isDeleted) throw new Error("This policy has been deleted.");
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  const setValues: Partial<typeof insurancePolicies.$inferInsert> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  function track<K extends keyof typeof insurancePolicies.$inferSelect>(
    key: K,
    value: (typeof insurancePolicies.$inferSelect)[K] | undefined,
  ) {
    if (value === undefined) return;
    if ((current as Record<string, unknown>)[key as string] !== value) {
      (setValues as Record<string, unknown>)[key as string] = value;
      oldValues[key as string] = (current as Record<string, unknown>)[key as string];
      newValues[key as string] = value;
    }
  }

  if (parsed.policyNumber !== undefined) track("policyNumber", parsed.policyNumber);
  if (parsed.insurerName !== undefined) track("insurerName", parsed.insurerName);
  if (parsed.insurerContact !== undefined) {
    track("insurerContact", (parsed.insurerContact ?? null) as never);
  }
  if (parsed.policyType !== undefined) track("policyType", parsed.policyType);
  if (parsed.insuredSubject !== undefined) track("insuredSubject", parsed.insuredSubject);
  if (parsed.linkedTitleId !== undefined) {
    track("linkedTitleId", (parsed.linkedTitleId ?? null) as never);
  }
  if (parsed.coverageStart !== undefined) track("coverageStart", parsed.coverageStart);
  if (parsed.coverageEnd !== undefined) track("coverageEnd", parsed.coverageEnd);
  if (parsed.policyValue !== undefined) {
    track("policyValue", String(parsed.policyValue) as unknown as never);
  }
  if (parsed.premiumAmount !== undefined) {
    track(
      "premiumAmount",
      (parsed.premiumAmount === null ? null : String(parsed.premiumAmount)) as never,
    );
  }
  if (parsed.currency !== undefined) track("currency", parsed.currency);

  // Cross-field: end must remain > start after edits.
  const nextStart = (setValues.coverageStart ?? current.coverageStart) as string;
  const nextEnd = (setValues.coverageEnd ?? current.coverageEnd) as string;
  if (nextEnd <= nextStart) {
    throw new Error("Coverage end date must be after the start date.");
  }

  if (Object.keys(setValues).length === 0) return;

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(insurancePolicies)
      .set({
        ...setValues,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${insurancePolicies.version} + 1`,
      })
      .where(
        and(
          eq(insurancePolicies.id, parsed.id),
          eq(insurancePolicies.version, parsed.version),
        ),
      )
      .returning({ id: insurancePolicies.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(auditLog).values({
      entity: "insurance_policies",
      entityId: parsed.id,
      action: "update",
      actorId: user.id,
      oldValue: JSON.stringify(oldValues),
      newValue: JSON.stringify(newValues),
      reason: parsed.reason,
    });
  });

  revalidatePath(`/insurance/${parsed.id}`);
  revalidatePath("/insurance");
}
