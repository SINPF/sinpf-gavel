"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { titles, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { updateTitleSchema } from "@/db/title-validator";

// FR-M5-001 update — with optimistic lock, reason and audit. The fixed-term
// rule (AC-M5-001.3) is re-checked after applying edits.
export async function updateTitle(input: unknown) {
  const parsed = updateTitleSchema.parse(input);
  const user = await assertCan("update_title");

  const [current] = await db.select().from(titles).where(eq(titles.id, parsed.id));
  if (!current) throw new Error("Title not found.");
  if (current.isDeleted) throw new Error("This title has been deleted.");
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  const setValues: Partial<typeof titles.$inferInsert> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  function track<K extends keyof typeof titles.$inferSelect>(
    key: K,
    value: (typeof titles.$inferSelect)[K] | undefined,
  ) {
    if (value === undefined) return;
    if ((current as Record<string, unknown>)[key as string] !== value) {
      (setValues as Record<string, unknown>)[key as string] = value;
      oldValues[key as string] = (current as Record<string, unknown>)[key as string];
      newValues[key as string] = value;
    }
  }

  if (parsed.titleNumber !== undefined) {
    // Uniqueness is guarded by the DB constraint; surface a friendlier error
    // if it fires.
    track("titleNumber", parsed.titleNumber);
  }
  if (parsed.location !== undefined) track("location", parsed.location);
  if (parsed.ownershipType !== undefined) track("ownershipType", parsed.ownershipType);
  if (parsed.registeredOwner !== undefined) {
    track("registeredOwner", (parsed.registeredOwner ?? null) as never);
  }
  if (parsed.termStart !== undefined) {
    track("termStart", (parsed.termStart ?? null) as never);
  }
  if (parsed.termEnd !== undefined) {
    track("termEnd", (parsed.termEnd ?? null) as never);
  }
  if (parsed.notes !== undefined) track("notes", (parsed.notes ?? null) as never);

  // AC-M5-001.3 — re-verify fixed-term rule after edits.
  const nextOwnership =
    (setValues.ownershipType ?? current.ownershipType) as string;
  const nextStart = (setValues.termStart ?? current.termStart) as string | null;
  const nextEnd = (setValues.termEnd ?? current.termEnd) as string | null;
  if (nextOwnership === "fixed_term_estate") {
    if (!nextStart || !nextEnd) {
      throw new Error("Fixed-term estates require both a term start and end date.");
    }
    if (nextEnd <= nextStart) {
      throw new Error("Term end date must be after the start date.");
    }
  }

  if (Object.keys(setValues).length === 0) return;

  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const result = await tx
        .update(titles)
        .set({
          ...setValues,
          updatedBy: user.id,
          updatedAt: now,
          version: sql`${titles.version} + 1`,
        })
        .where(and(eq(titles.id, parsed.id), eq(titles.version, parsed.version)))
        .returning({ id: titles.id });
      if (result.length === 0) throw new Error("STALE_RECORD");

      await tx.insert(auditLog).values({
        entity: "titles",
        entityId: parsed.id,
        action: "update",
        actorId: user.id,
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(newValues),
        reason: parsed.reason,
      });
    });
  } catch (e) {
    // Postgres unique_violation SQLSTATE 23505 → friendlier message
    if (e instanceof Error && /titles_title_number_unique/i.test(e.message)) {
      throw new Error("A title with that number already exists.");
    }
    throw e;
  }

  revalidatePath(`/titles/${parsed.id}`);
  revalidatePath("/titles");
}
