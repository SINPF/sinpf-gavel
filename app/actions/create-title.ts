"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  titles,
  titleAttachments,
  titleDocumentTypeEnum,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { uploadFile } from "@/lib/storage";
import { insertTitleSchema } from "@/db/title-validator";
import path from "path";

type DocType = (typeof titleDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(titleDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

// AC-M5-001.2 — duplicate title_number is a hard reject. The thrown message
// carries the existing title id so the client can render an inline link to
// the existing title. Kept as a plain Error message because "use server"
// files can only export async functions.
export async function createTitle(formData: FormData) {
  const user = await assertCan("create_title");

  const parsed = insertTitleSchema.parse({
    titleNumber: String(formData.get("titleNumber") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    ownershipType: String(formData.get("ownershipType") ?? "other"),
    registeredOwner: (formData.get("registeredOwner") as string | null) || null,
    termStart: (formData.get("termStart") as string | null) || null,
    termEnd: (formData.get("termEnd") as string | null) || null,
    notes: (formData.get("notes") as string | null) || null,
  });

  const [existing] = await db
    .select({ id: titles.id })
    .from(titles)
    .where(and(eq(titles.titleNumber, parsed.titleNumber), eq(titles.isDeleted, false)))
    .limit(1);
  if (existing) throw new Error(`DUPLICATE_TITLE_NUMBER:${existing.id}`);

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(titles)
      .values({
        titleNumber: parsed.titleNumber,
        location: parsed.location,
        ownershipType: parsed.ownershipType,
        registeredOwner: parsed.registeredOwner ?? null,
        termStart: parsed.termStart ?? null,
        termEnd: parsed.termEnd ?? null,
        notes: parsed.notes ?? null,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: titles.id, titleNumber: titles.titleNumber });

    await tx.insert(auditLog).values({
      entity: "titles",
      entityId: row.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({
        titleNumber: row.titleNumber,
        location: parsed.location,
        ownershipType: parsed.ownershipType,
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
    const objectKey = `titles/${inserted.id}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    await db.insert(titleAttachments).values({
      titleId: inserted.id,
      fileName: file.name,
      fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
      fileUrl: objectKey,
      documentType: docType,
      uploadedBy: user.id,
    });
  }

  revalidatePath("/titles");
  return { titleId: inserted.id, titleNumber: inserted.titleNumber };
}
