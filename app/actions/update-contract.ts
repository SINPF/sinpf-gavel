"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contracts, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { updateContractSchema } from "@/db/contract-validator";

// FR-M2-001 / FR-M2-003 — update contract details with an optimistic lock and
// a mandatory reason. Terminated contracts are read-only (use restore/re-open
// procedures out of band).
export async function updateContract(input: unknown) {
  const parsed = updateContractSchema.parse(input);
  const user = await assertCan("update_contract");

  const [current] = await db.select().from(contracts).where(eq(contracts.id, parsed.id));
  if (!current) throw new Error("Contract not found");
  if (current.terminatedDate) {
    throw new Error("This contract is terminated. It cannot be edited.");
  }
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  const setValues: Partial<typeof contracts.$inferInsert> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  function track<K extends keyof typeof contracts.$inferSelect>(
    key: K,
    value: (typeof contracts.$inferSelect)[K] | undefined,
  ) {
    if (value === undefined) return;
    if ((current as Record<string, unknown>)[key as string] !== value) {
      (setValues as Record<string, unknown>)[key as string] = value;
      oldValues[key as string] = (current as Record<string, unknown>)[key as string];
      newValues[key as string] = value;
    }
  }

  if (parsed.title !== undefined) track("title", parsed.title);
  if (parsed.parties !== undefined) {
    // Array equality via JSON string; Drizzle passes arrays through as-is.
    if (JSON.stringify(current.parties) !== JSON.stringify(parsed.parties)) {
      setValues.parties = parsed.parties;
      oldValues.parties = current.parties;
      newValues.parties = parsed.parties;
    }
  }
  if (parsed.contractType !== undefined) track("contractType", parsed.contractType);
  if (parsed.startDate !== undefined) track("startDate", parsed.startDate);
  if (parsed.endDate !== undefined) track("endDate", parsed.endDate);
  if (parsed.financialYear !== undefined) track("financialYear", parsed.financialYear);
  if (parsed.contractValue !== undefined) {
    track("contractValue", String(parsed.contractValue) as unknown as never);
  }
  if (parsed.currency !== undefined) track("currency", parsed.currency);
  if (parsed.owningDepartment !== undefined) {
    track("owningDepartment", (parsed.owningDepartment ?? null) as never);
  }
  if (parsed.linkedTitleId !== undefined) {
    track("linkedTitleId", (parsed.linkedTitleId ?? null) as never);
  }

  // Cross-field: end must remain ≥ start after edits.
  const nextStart = (setValues.startDate ?? current.startDate) as string;
  const nextEnd = (setValues.endDate ?? current.endDate) as string;
  if (nextEnd < nextStart) throw new Error("End date cannot be before start date.");

  if (Object.keys(setValues).length === 0) return; // nothing to do

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(contracts)
      .set({
        ...setValues,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${contracts.version} + 1`,
      })
      .where(and(eq(contracts.id, parsed.id), eq(contracts.version, parsed.version)))
      .returning({ id: contracts.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(auditLog).values({
      entity: "contracts",
      entityId: parsed.id,
      action: "update",
      actorId: user.id,
      oldValue: JSON.stringify(oldValues),
      newValue: JSON.stringify(newValues),
      reason: parsed.reason,
    });
  });

  revalidatePath(`/contracts/${parsed.id}`);
  revalidatePath("/contracts");
}
