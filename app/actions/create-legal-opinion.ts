"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  legalOpinions,
  legalOpinionAttachments,
  legalOpinionDocumentTypeEnum,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { nextLegalOpinionRef } from "@/lib/legal-opinion-ref";
import { uploadFile } from "@/lib/storage";
import { insertLegalOpinionSchema } from "@/db/legal-opinion-validator";
import path from "path";

type DocType = (typeof legalOpinionDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(legalOpinionDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function createLegalOpinion(formData: FormData) {
  const user = await assertCan("create_legal_opinion");

  const parsed = insertLegalOpinionSchema.parse({
    subjectMatter: String(formData.get("subjectMatter") ?? "").trim(),
    requestingDepartment: String(formData.get("requestingDepartment") ?? "").trim(),
    dateRequested: (formData.get("dateRequested") as string | null) || null,
    opinionDate: String(formData.get("opinionDate") ?? ""),
    authorId: (formData.get("authorId") as string | null) || null,
    summary: (formData.get("summary") as string | null) || null,
    keywords: formData.getAll("keywords") as string[],
    supersedesOpinionId: (formData.get("supersedesOpinionId") as string | null) || null,
  });

  // AC-M4-004.2 — if superseding, the parent must exist and be finalised.
  if (parsed.supersedesOpinionId) {
    const [parent] = await db
      .select({ id: legalOpinions.id, state: legalOpinions.state })
      .from(legalOpinions)
      .where(
        and(
          eq(legalOpinions.id, parsed.supersedesOpinionId),
          eq(legalOpinions.isDeleted, false),
        ),
      );
    if (!parent) throw new Error("Opinion being superseded not found.");
    if (parent.state !== "finalised") {
      throw new Error("Only finalised opinions can be superseded.");
    }
  }

  // AC-M4-001.2 — author defaults to the creating user when omitted.
  const authorId = parsed.authorId ?? user.id;

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    const opinionRef = await nextLegalOpinionRef(
      tx as unknown as typeof db,
      new Date(parsed.opinionDate).getFullYear(),
    );
    const [row] = await tx
      .insert(legalOpinions)
      .values({
        opinionRef,
        subjectMatter: parsed.subjectMatter,
        requestingDepartment: parsed.requestingDepartment,
        dateRequested: parsed.dateRequested ?? null,
        opinionDate: parsed.opinionDate,
        authorId,
        summary: parsed.summary ?? null,
        keywords: parsed.keywords,
        supersedesOpinionId: parsed.supersedesOpinionId ?? null,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: legalOpinions.id,
        opinionRef: legalOpinions.opinionRef,
      });

    await tx.insert(auditLog).values({
      entity: "legal_opinions",
      entityId: row.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({
        opinionRef: row.opinionRef,
        subjectMatter: parsed.subjectMatter,
        requestingDepartment: parsed.requestingDepartment,
        authorId,
        supersedesOpinionId: parsed.supersedesOpinionId ?? null,
      }),
    });
    return row;
  });

  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);
  const fileDocTypes = formData.getAll("fileDocTypes") as string[];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const docType = coerceDocType(fileDocTypes[i]);
    const objectKey = `legal-opinions/${inserted.id}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    await db.insert(legalOpinionAttachments).values({
      legalOpinionId: inserted.id,
      fileName: file.name,
      fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
      fileUrl: objectKey,
      documentType: docType,
      uploadedBy: user.id,
    });
  }

  revalidatePath("/legal-opinions");
  return { opinionId: inserted.id, opinionRef: inserted.opinionRef };
}
