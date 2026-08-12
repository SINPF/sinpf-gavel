"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  legalOpinionAttachments,
  legalOpinions,
  legalOpinionDocumentTypeEnum,
  auditLog,
} from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import path from "path";

type DocType = (typeof legalOpinionDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(legalOpinionDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function uploadLegalOpinionDocument(formData: FormData) {
  const opinionId = formData.get("opinionId") as string;
  const docType = coerceDocType(formData.get("documentType") as string | null);
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

  if (!opinionId || files.length === 0) throw new Error("Missing required fields");
  const [current] = await db
    .select({
      id: legalOpinions.id,
      authorId: legalOpinions.authorId,
      state: legalOpinions.state,
    })
    .from(legalOpinions)
    .where(eq(legalOpinions.id, opinionId));
  if (!current) throw new Error("Opinion not found");

  const user = await assertCan("upload_legal_opinion_document", {
    ownedByUserId: current.authorId,
  });

  // BR-M4-01 — finalised opinions accept no new documents.
  if (current.state === "finalised") {
    throw new Error("This opinion is finalised. No further documents can be attached.");
  }

  for (const file of files) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `legal-opinions/${opinionId}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    const [inserted] = await db
      .insert(legalOpinionAttachments)
      .values({
        legalOpinionId: opinionId,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
        fileUrl: objectKey,
        documentType: docType,
        uploadedBy: user.id,
      })
      .returning({ id: legalOpinionAttachments.id });

    await db.insert(auditLog).values({
      entity: "legal_opinion_attachments",
      entityId: inserted.id,
      action: "upload",
      actorId: user.id,
      newValue: JSON.stringify({ opinionId, documentType: docType, fileName: file.name }),
    });
  }

  await db
    .update(legalOpinions)
    .set({ updatedAt: new Date() })
    .where(eq(legalOpinions.id, opinionId));
  revalidatePath(`/legal-opinions/${opinionId}`);
  revalidatePath("/legal-opinions");
}

export async function withdrawLegalOpinionDocument(input: {
  documentId: string;
  reason: string;
}) {
  const user = await assertCan("withdraw_legal_opinion_document");
  if (input.reason.trim().length < 10) {
    throw new Error("Give a reason (10 chars minimum) for withdrawing this document.");
  }
  const [doc] = await db
    .select({
      id: legalOpinionAttachments.id,
      legalOpinionId: legalOpinionAttachments.legalOpinionId,
      isWithdrawn: legalOpinionAttachments.isWithdrawn,
    })
    .from(legalOpinionAttachments)
    .where(eq(legalOpinionAttachments.id, input.documentId));
  if (!doc) throw new Error("Document not found");
  if (doc.isWithdrawn) throw new Error("Document is already withdrawn");

  // BR-M4-01 — cannot withdraw a document from a finalised opinion; that
  // would mutate the finalised record's evidence base.
  const [parent] = await db
    .select({ state: legalOpinions.state })
    .from(legalOpinions)
    .where(eq(legalOpinions.id, doc.legalOpinionId));
  if (parent?.state === "finalised") {
    throw new Error("Cannot withdraw a document from a finalised opinion.");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(legalOpinionAttachments)
      .set({
        isWithdrawn: true,
        withdrawnBy: user.id,
        withdrawnAt: now,
        withdrawalReason: input.reason,
      })
      .where(eq(legalOpinionAttachments.id, input.documentId));

    await tx.insert(auditLog).values({
      entity: "legal_opinion_attachments",
      entityId: input.documentId,
      action: "withdraw",
      actorId: user.id,
      reason: input.reason,
    });
  });

  revalidatePath(`/legal-opinions/${doc.legalOpinionId}`);
}
