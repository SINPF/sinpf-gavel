"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { encumbrances, titles, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { insertEncumbranceSchema } from "@/db/encumbrance-validator";

// FR-M5-002 — record an encumbrance against a title. Always inserted in
// state='active'. Discharge is a separate action.
export async function createEncumbrance(input: unknown) {
  const parsed = insertEncumbranceSchema.parse(input);
  const user = await assertCan("record_encumbrance");

  const [title] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(and(eq(titles.id, parsed.titleId), eq(titles.isDeleted, false)));
  if (!title) throw new Error("Parent title not found.");

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(encumbrances)
      .values({
        titleId: parsed.titleId,
        encumbranceType: parsed.encumbranceType,
        holderName: parsed.holderName,
        registeredDate: parsed.registeredDate,
        expiryDate: parsed.expiryDate ?? null,
        linkedContractId: parsed.linkedContractId ?? null,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: encumbrances.id });

    await tx.insert(auditLog).values({
      entity: "encumbrances",
      entityId: row.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({
        titleId: parsed.titleId,
        encumbranceType: parsed.encumbranceType,
        holderName: parsed.holderName,
        registeredDate: parsed.registeredDate,
      }),
    });
    return row;
  });

  revalidatePath(`/titles/${parsed.titleId}`);
  revalidatePath("/titles");
  return { encumbranceId: inserted.id };
}
