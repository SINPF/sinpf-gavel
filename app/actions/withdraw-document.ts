"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { caseAttachments, auditLog } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { refreshIntakeFlag } from "@/lib/intake";

// FR-M1-008 / §3 — only MLS may withdraw a document. Withdrawal is a soft
// state (never delete): the document remains in exports with a note.
export async function withdrawDocument(input: {
  documentId: string;
  reason: string;
}) {
  const user = await assertCan("withdraw_document");
  if (input.reason.trim().length < 10) {
    throw new Error("Give a reason (10 chars minimum) for withdrawing this document.");
  }

  const [doc] = await db
    .select({ id: caseAttachments.id, caseId: caseAttachments.caseReferralId, isWithdrawn: caseAttachments.isWithdrawn })
    .from(caseAttachments)
    .where(eq(caseAttachments.id, input.documentId));
  if (!doc) throw new Error("Document not found");
  if (doc.isWithdrawn) throw new Error("Document is already withdrawn");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(caseAttachments)
      .set({
        isWithdrawn: true,
        withdrawnBy: user.id,
        withdrawnAt: now,
        withdrawalReason: input.reason,
      })
      .where(eq(caseAttachments.id, input.documentId));

    await tx.insert(auditLog).values({
      entity: "case_attachments",
      entityId: input.documentId,
      action: "withdraw",
      actorId: user.id,
      reason: input.reason,
    });
  });

  await refreshIntakeFlag(doc.caseId);
  revalidatePath(`/cases/${doc.caseId}`);
}
