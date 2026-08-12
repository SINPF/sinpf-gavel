"use server";

import { db } from "@/db";
import { caseAttachments, caseReferrals, documentTypeEnum } from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { refreshIntakeFlag } from "@/lib/intake";
import { assertCan } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import path from "path";

type DocType = (typeof documentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(documentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function uploadCaseDocument(formData: FormData) {
  const session = await assertCan("upload_document");

  const caseId = formData.get("caseId") as string;
  const docType = coerceDocType(formData.get("documentType") as string | null);
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

  if (!caseId || files.length === 0) throw new Error("Missing required fields");

  for (const file of files) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `cases/${caseId}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    await db.insert(caseAttachments).values({
      caseReferralId: caseId,
      fileName: file.name,
      fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
      fileUrl: objectKey,
      documentType: docType,
      uploadedBy: session.id,
    });
  }

  await db
    .update(caseReferrals)
    .set({ lastActivityAt: new Date() })
    .where(eq(caseReferrals.id, caseId));
  await refreshIntakeFlag(caseId);

  revalidatePath(`/cases/${caseId}`);
}
