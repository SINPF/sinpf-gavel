"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  insurancePolicyAttachments,
  insurancePolicies,
  insurancePolicyDocumentTypeEnum,
  auditLog,
} from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import path from "path";

type DocType = (typeof insurancePolicyDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(insurancePolicyDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function uploadInsuranceDocument(formData: FormData) {
  const user = await assertCan("upload_insurance_document");

  const policyId = formData.get("policyId") as string;
  const docType = coerceDocType(formData.get("documentType") as string | null);
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

  if (!policyId || files.length === 0) throw new Error("Missing required fields");
  const [current] = await db
    .select({ id: insurancePolicies.id })
    .from(insurancePolicies)
    .where(eq(insurancePolicies.id, policyId));
  if (!current) throw new Error("Policy not found");

  for (const file of files) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `insurance/${policyId}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    const [inserted] = await db
      .insert(insurancePolicyAttachments)
      .values({
        insurancePolicyId: policyId,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
        fileUrl: objectKey,
        documentType: docType,
        uploadedBy: user.id,
      })
      .returning({ id: insurancePolicyAttachments.id });

    await db.insert(auditLog).values({
      entity: "insurance_policy_attachments",
      entityId: inserted.id,
      action: "upload",
      actorId: user.id,
      newValue: JSON.stringify({ policyId, documentType: docType, fileName: file.name }),
    });
  }

  await db
    .update(insurancePolicies)
    .set({ updatedAt: new Date() })
    .where(eq(insurancePolicies.id, policyId));
  revalidatePath(`/insurance/${policyId}`);
  revalidatePath("/insurance");
}

export async function withdrawInsuranceDocument(input: {
  documentId: string;
  reason: string;
}) {
  const user = await assertCan("withdraw_insurance_document");
  if (input.reason.trim().length < 10) {
    throw new Error("Give a reason (10 chars minimum) for withdrawing this document.");
  }
  const [doc] = await db
    .select({
      id: insurancePolicyAttachments.id,
      insurancePolicyId: insurancePolicyAttachments.insurancePolicyId,
      isWithdrawn: insurancePolicyAttachments.isWithdrawn,
    })
    .from(insurancePolicyAttachments)
    .where(eq(insurancePolicyAttachments.id, input.documentId));
  if (!doc) throw new Error("Document not found");
  if (doc.isWithdrawn) throw new Error("Document is already withdrawn");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(insurancePolicyAttachments)
      .set({
        isWithdrawn: true,
        withdrawnBy: user.id,
        withdrawnAt: now,
        withdrawalReason: input.reason,
      })
      .where(eq(insurancePolicyAttachments.id, input.documentId));

    await tx.insert(auditLog).values({
      entity: "insurance_policy_attachments",
      entityId: input.documentId,
      action: "withdraw",
      actorId: user.id,
      reason: input.reason,
    });
  });

  revalidatePath(`/insurance/${doc.insurancePolicyId}`);
}
