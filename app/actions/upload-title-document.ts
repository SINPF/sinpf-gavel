"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  titleAttachments,
  titles,
  encumbrances,
  titleDocumentTypeEnum,
  auditLog,
} from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import path from "path";

type DocType = (typeof titleDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(titleDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

// FR-M5-003 — store title documents and survey plans. Uploads may optionally
// be scoped to a specific encumbrance (e.g. an encumbrance registration
// document, or later a discharge document — though discharge documents are
// normally uploaded via discharge-encumbrance.ts).
export async function uploadTitleDocument(formData: FormData) {
  const user = await assertCan("upload_title_document");

  const titleId = formData.get("titleId") as string;
  const encumbranceId = (formData.get("encumbranceId") as string | null) || null;
  const docType = coerceDocType(formData.get("documentType") as string | null);
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

  if (!titleId || files.length === 0) throw new Error("Missing required fields");
  const [title] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(eq(titles.id, titleId));
  if (!title) throw new Error("Title not found");

  if (encumbranceId) {
    const [enc] = await db
      .select({ id: encumbrances.id, titleId: encumbrances.titleId })
      .from(encumbrances)
      .where(eq(encumbrances.id, encumbranceId));
    if (!enc) throw new Error("Encumbrance not found");
    if (enc.titleId !== titleId) {
      throw new Error("Encumbrance does not belong to this title.");
    }
  }

  for (const file of files) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = encumbranceId
      ? `titles/${titleId}/encumbrances/${encumbranceId}/${docType}/${safeName}`
      : `titles/${titleId}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    const [inserted] = await db
      .insert(titleAttachments)
      .values({
        titleId,
        encumbranceId,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
        fileUrl: objectKey,
        documentType: docType,
        uploadedBy: user.id,
      })
      .returning({ id: titleAttachments.id });

    await db.insert(auditLog).values({
      entity: "title_attachments",
      entityId: inserted.id,
      action: "upload",
      actorId: user.id,
      newValue: JSON.stringify({
        titleId,
        encumbranceId,
        documentType: docType,
        fileName: file.name,
      }),
    });
  }

  await db
    .update(titles)
    .set({ updatedAt: new Date() })
    .where(eq(titles.id, titleId));
  revalidatePath(`/titles/${titleId}`);
  revalidatePath("/titles");
}

export async function withdrawTitleDocument(input: {
  documentId: string;
  reason: string;
}) {
  const user = await assertCan("withdraw_title_document");
  if (input.reason.trim().length < 10) {
    throw new Error("Give a reason (10 chars minimum) for withdrawing this document.");
  }
  const [doc] = await db
    .select({
      id: titleAttachments.id,
      titleId: titleAttachments.titleId,
      isWithdrawn: titleAttachments.isWithdrawn,
    })
    .from(titleAttachments)
    .where(eq(titleAttachments.id, input.documentId));
  if (!doc) throw new Error("Document not found");
  if (doc.isWithdrawn) throw new Error("Document is already withdrawn");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(titleAttachments)
      .set({
        isWithdrawn: true,
        withdrawnBy: user.id,
        withdrawnAt: now,
        withdrawalReason: input.reason,
      })
      .where(eq(titleAttachments.id, input.documentId));

    await tx.insert(auditLog).values({
      entity: "title_attachments",
      entityId: input.documentId,
      action: "withdraw",
      actorId: user.id,
      reason: input.reason,
    });
  });

  revalidatePath(`/titles/${doc.titleId}`);
}
