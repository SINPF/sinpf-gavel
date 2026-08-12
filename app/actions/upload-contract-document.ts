"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contractAttachments, contracts, contractDocumentTypeEnum, auditLog } from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import path from "path";

type DocType = (typeof contractDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(contractDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function uploadContractDocument(formData: FormData) {
  const user = await assertCan("upload_contract_document");

  const contractId = formData.get("contractId") as string;
  const docType = coerceDocType(formData.get("documentType") as string | null);
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

  if (!contractId || files.length === 0) throw new Error("Missing required fields");
  const [current] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, contractId));
  if (!current) throw new Error("Contract not found");

  for (const file of files) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `contracts/${contractId}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    const [inserted] = await db
      .insert(contractAttachments)
      .values({
        contractId,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
        fileUrl: objectKey,
        documentType: docType,
        uploadedBy: user.id,
      })
      .returning({ id: contractAttachments.id });

    await db.insert(auditLog).values({
      entity: "contract_attachments",
      entityId: inserted.id,
      action: "upload",
      actorId: user.id,
      newValue: JSON.stringify({ contractId, documentType: docType, fileName: file.name }),
    });
  }

  await db.update(contracts).set({ updatedAt: new Date() }).where(eq(contracts.id, contractId));
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
}

export async function withdrawContractDocument(input: { documentId: string; reason: string }) {
  const user = await assertCan("withdraw_contract_document");
  if (input.reason.trim().length < 10) {
    throw new Error("Give a reason (10 chars minimum) for withdrawing this document.");
  }
  const [doc] = await db
    .select({ id: contractAttachments.id, contractId: contractAttachments.contractId, isWithdrawn: contractAttachments.isWithdrawn })
    .from(contractAttachments)
    .where(eq(contractAttachments.id, input.documentId));
  if (!doc) throw new Error("Document not found");
  if (doc.isWithdrawn) throw new Error("Document is already withdrawn");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(contractAttachments)
      .set({
        isWithdrawn: true,
        withdrawnBy: user.id,
        withdrawnAt: now,
        withdrawalReason: input.reason,
      })
      .where(eq(contractAttachments.id, input.documentId));

    await tx.insert(auditLog).values({
      entity: "contract_attachments",
      entityId: input.documentId,
      action: "withdraw",
      actorId: user.id,
      reason: input.reason,
    });
  });

  revalidatePath(`/contracts/${doc.contractId}`);
}
