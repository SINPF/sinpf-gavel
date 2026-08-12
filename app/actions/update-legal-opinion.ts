"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { legalOpinions, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { updateLegalOpinionSchema } from "@/db/legal-opinion-validator";

// FR-M4-001 / BR-M4-01 — update opinion details while draft, with an
// optimistic lock and a mandatory reason. Finalised opinions are read-only.
export async function updateLegalOpinion(input: unknown) {
  const parsed = updateLegalOpinionSchema.parse(input);

  const [current] = await db
    .select()
    .from(legalOpinions)
    .where(eq(legalOpinions.id, parsed.id));
  if (!current) throw new Error("Opinion not found.");
  if (current.isDeleted) throw new Error("This opinion has been deleted.");

  // Author owns the draft — "own" scope keyed on authorId.
  const user = await assertCan("update_legal_opinion", {
    ownedByUserId: current.authorId,
  });

  // BR-M4-01 — finalised is immutable to every role, including MLS.
  if (current.state === "finalised") {
    throw new Error("This opinion is finalised. Issue a superseding opinion to correct it.");
  }
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  const setValues: Partial<typeof legalOpinions.$inferInsert> = {};
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  function track<K extends keyof typeof legalOpinions.$inferSelect>(
    key: K,
    value: (typeof legalOpinions.$inferSelect)[K] | undefined,
  ) {
    if (value === undefined) return;
    if ((current as Record<string, unknown>)[key as string] !== value) {
      (setValues as Record<string, unknown>)[key as string] = value;
      oldValues[key as string] = (current as Record<string, unknown>)[key as string];
      newValues[key as string] = value;
    }
  }

  if (parsed.subjectMatter !== undefined) track("subjectMatter", parsed.subjectMatter);
  if (parsed.requestingDepartment !== undefined) {
    track("requestingDepartment", parsed.requestingDepartment);
  }
  if (parsed.dateRequested !== undefined) {
    track("dateRequested", (parsed.dateRequested ?? null) as never);
  }
  if (parsed.opinionDate !== undefined) track("opinionDate", parsed.opinionDate);
  if (parsed.authorId !== undefined && parsed.authorId !== null) {
    track("authorId", parsed.authorId);
  }
  if (parsed.summary !== undefined) {
    track("summary", (parsed.summary ?? null) as never);
  }
  // Keywords: array equality via JSON string.
  if (parsed.keywords !== undefined) {
    if (JSON.stringify(current.keywords) !== JSON.stringify(parsed.keywords)) {
      setValues.keywords = parsed.keywords;
      oldValues.keywords = current.keywords;
      newValues.keywords = parsed.keywords;
    }
  }

  // Guard: opinionDate cannot be in the future post-edit.
  const nextOpinionDate = (setValues.opinionDate ?? current.opinionDate) as string;
  if (nextOpinionDate > new Date().toISOString().slice(0, 10)) {
    throw new Error("Opinion date cannot be in the future.");
  }

  if (Object.keys(setValues).length === 0) return;

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(legalOpinions)
      .set({
        ...setValues,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${legalOpinions.version} + 1`,
      })
      .where(
        and(
          eq(legalOpinions.id, parsed.id),
          eq(legalOpinions.version, parsed.version),
        ),
      )
      .returning({ id: legalOpinions.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(auditLog).values({
      entity: "legal_opinions",
      entityId: parsed.id,
      action: "update",
      actorId: user.id,
      oldValue: JSON.stringify(oldValues),
      newValue: JSON.stringify(newValues),
      reason: parsed.reason,
    });
  });

  revalidatePath(`/legal-opinions/${parsed.id}`);
  revalidatePath("/legal-opinions");
}
