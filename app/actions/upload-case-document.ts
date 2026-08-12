"use server";

import { db } from "@/db";
import { caseAttachments, caseReferrals, documentTypeEnum } from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { refreshIntakeFlag } from "@/lib/intake";
import { eq } from "drizzle-orm";
import path from "path";

type DocType = (typeof documentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(documentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function uploadCaseDocument(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

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
      uploadedBy: session.user.id,
    });
  }

  await db
    .update(caseReferrals)
    .set({ lastActivityAt: new Date() })
    .where(eq(caseReferrals.id, caseId));
  await refreshIntakeFlag(caseId);

  revalidatePath(`/cases/${caseId}`);
}
