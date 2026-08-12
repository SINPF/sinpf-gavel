"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  legalOpinions,
  legalOpinionAttachments,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { finaliseLegalOpinionSchema } from "@/db/legal-opinion-validator";

// FR-M4-004 — one-way transition from draft to finalised. Requires:
//   1. A non-withdrawn signed_opinion document (AC-M4-004.3).
//   2. Author scope or MLS (see rbac MATRIX).
// After finalisation the opinion becomes immutable (BR-M4-01) — enforced
// by update-legal-opinion.ts + upload-legal-opinion-document.ts.
export async function finaliseLegalOpinion(input: unknown) {
  const parsed = finaliseLegalOpinionSchema.parse(input);

  const [current] = await db
    .select()
    .from(legalOpinions)
    .where(eq(legalOpinions.id, parsed.id));
  if (!current) throw new Error("Opinion not found.");
  if (current.isDeleted) throw new Error("This opinion has been deleted.");

  const user = await assertCan("finalise_legal_opinion", {
    ownedByUserId: current.authorId,
  });

  if (current.state === "finalised") {
    throw new Error("This opinion is already finalised.");
  }
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");

  // AC-M4-004.3 — must have at least one non-withdrawn signed_opinion doc.
  const signedDocs = await db
    .select({ id: legalOpinionAttachments.id })
    .from(legalOpinionAttachments)
    .where(
      and(
        eq(legalOpinionAttachments.legalOpinionId, parsed.id),
        eq(legalOpinionAttachments.documentType, "signed_opinion"),
        eq(legalOpinionAttachments.isWithdrawn, false),
      ),
    )
    .limit(1);
  if (signedDocs.length === 0) {
    throw new Error("SIGNED_OPINION_REQUIRED");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const result = await tx
      .update(legalOpinions)
      .set({
        state: "finalised",
        finalisedAt: now,
        finalisedBy: user.id,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${legalOpinions.version} + 1`,
      })
      .where(
        and(
          eq(legalOpinions.id, parsed.id),
          eq(legalOpinions.version, parsed.version),
          eq(legalOpinions.state, "draft"),
        ),
      )
      .returning({ id: legalOpinions.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    await tx.insert(auditLog).values({
      entity: "legal_opinions",
      entityId: parsed.id,
      action: "finalise",
      field: "state",
      oldValue: "draft",
      newValue: "finalised",
      actorId: user.id,
    });
  });

  revalidatePath(`/legal-opinions/${parsed.id}`);
  revalidatePath("/legal-opinions");
}
