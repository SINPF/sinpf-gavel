"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { encumbrances, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { updateEncumbranceSchema } from "@/db/encumbrance-validator";

// Encumbrances are editable while active. Once discharged they become
// read-only (parity with BR-M4-01 finalisation) so the record of what was
// registered against the title stays honest.
export async function updateEncumbrance(input: unknown) {
  const parsed = updateEncumbranceSchema.parse(input);
  const user = await assertCan("update_encumbrance");

  const [current] = await db
    .select()
    .from(encumbrances)
    .where(eq(encumbrances.id, parsed.id));
  if (!current) throw new Error("Encumbrance not found.");
  if (current.state === "discharged") {
    throw new Error("This encumbrance is discharged and can no longer be edited.");
  }
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  const setValues: Partial<typeof encumbrances.$inferInsert> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  function track<K extends keyof typeof encumbrances.$inferSelect>(
    key: K,
    value: (typeof encumbrances.$inferSelect)[K] | undefined,
  ) {
    if (value === undefined) return;
    if ((current as Record<string, unknown>)[key as string] !== value) {
      (setValues as Record<string, unknown>)[key as string] = value;
      oldValues[key as string] = (current as Record<string, unknown>)[key as string];
      newValues[key as string] = value;
    }
  }

  if (parsed.encumbranceType !== undefined) track("encumbranceType", parsed.encumbranceType);
  if (parsed.holderName !== undefined) track("holderName", parsed.holderName);
  if (parsed.registeredDate !== undefined) track("registeredDate", parsed.registeredDate);
  if (parsed.expiryDate !== undefined) {
    track("expiryDate", (parsed.expiryDate ?? null) as never);
  }
  if (parsed.linkedContractId !== undefined) {
    track("linkedContractId", (parsed.linkedContractId ?? null) as never);
  }

  const nextRegistered = (setValues.registeredDate ?? current.registeredDate) as string;
  const nextExpiry = (setValues.expiryDate ?? current.expiryDate) as string | null;
  if (nextExpiry && nextExpiry <= nextRegistered) {
    throw new Error("Expiry date must be after the registered date.");
  }

  if (Object.keys(setValues).length === 0) return;

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(encumbrances)
      .set({
        ...setValues,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${encumbrances.version} + 1`,
      })
      .where(
        and(
          eq(encumbrances.id, parsed.id),
          eq(encumbrances.version, parsed.version),
          eq(encumbrances.state, "active"),
        ),
      )
      .returning({ id: encumbrances.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(auditLog).values({
      entity: "encumbrances",
      entityId: parsed.id,
      action: "update",
      actorId: user.id,
      oldValue: JSON.stringify(oldValues),
      newValue: JSON.stringify(newValues),
      reason: parsed.reason,
    });
  });

  revalidatePath(`/titles/${current.titleId}`);
  revalidatePath("/titles");
}
