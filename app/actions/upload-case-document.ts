"use server";

import { db } from "@/db";
import { caseAttachments, caseActivities } from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import path from "path";

export async function uploadCaseDocument(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const caseId = formData.get("caseId") as string;
  const stage  = formData.get("stage")  as string;
  const files  = (formData.getAll("files") as File[]).filter((f) => f.size > 0);

  if (!caseId || !stage || files.length === 0) throw new Error("Missing required fields");

  for (const file of files) {
    const safeName  = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `cases/${caseId}/${stage}/${safeName}`;
    await uploadFile(objectKey, file);

    const ext = path.extname(file.name).slice(1).toLowerCase();
    await db.insert(caseAttachments).values({
      caseReferralId: caseId,
      fileName:       file.name,
      fileType:       ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
      fileUrl:        objectKey,
      stage,
      uploadedBy:     session.user.id,
    });

    await db.insert(caseActivities).values({
      caseReferralId: caseId,
      activityType:   "document_added",
      notes:          `Document uploaded: ${file.name}`,
      performedBy:    session.user.id,
    });
  }

  revalidatePath(`/cases/${caseId}`);
}
