"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contracts, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { terminateContractSchema } from "@/db/contract-validator";

// FR-M2-005 / BR-M2-01 — record termination. Status becomes derived TERMINATED
// once terminated_date is set. Only MLS may terminate.
export async function terminateContract(input: unknown) {
  const parsed = terminateContractSchema.parse(input);
  const user = await assertCan("terminate_contract");

  const [current] = await db.select().from(contracts).where(eq(contracts.id, parsed.id));
  if (!current) throw new Error("Contract not found");
  if (current.terminatedDate) throw new Error("This contract is already terminated.");
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  // Termination date must fall inside the contract's active window.
  if (parsed.terminatedDate < current.startDate) {
    throw new Error("Termination date cannot be before the contract start date.");
  }
  if (parsed.terminatedDate > current.endDate) {
    throw new Error("Termination date cannot be after the contract end date.");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(contracts)
      .set({
        terminatedDate: parsed.terminatedDate,
        terminationReason: parsed.reason,
        terminatedBy: user.id,
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
      action: "terminate",
      actorId: user.id,
      field: "terminated_date",
      newValue: parsed.terminatedDate,
      reason: parsed.reason,
    });
  });

  revalidatePath(`/contracts/${parsed.id}`);
  revalidatePath("/contracts");
}
