"use server";

import { db } from "@/db";
import { contracts, auditLog, contractAttachments, contractDocumentTypeEnum } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { nextContractRef } from "@/lib/contract-ref";
import { uploadFile } from "@/lib/storage";
import { insertContractSchema } from "@/db/contract-validator";
import path from "path";

type DocType = (typeof contractDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(contractDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function createContract(formData: FormData) {
  const user = await assertCan("create_contract");

  const parsed = insertContractSchema.parse({
    title: String(formData.get("title") ?? "").trim(),
    parties: (formData.getAll("parties") as string[]).map((p) => p.trim()).filter(Boolean),
    contractType: String(formData.get("contractType") ?? "other"),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    financialYear: formData.get("financialYear"),
    contractValue: formData.get("contractValue") ?? 0,
    currency: String(formData.get("currency") ?? "sbd"),
    owningDepartment: (formData.get("owningDepartment") as string | null)?.trim() || null,
    linkedTitleId: (formData.get("linkedTitleId") as string | null)?.trim() || null,
  });

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    const contractRef = await nextContractRef(
      tx as unknown as typeof db,
      new Date(parsed.startDate).getFullYear(),
    );
    const [row] = await tx
      .insert(contracts)
      .values({
        contractRef,
        title: parsed.title,
        parties: parsed.parties,
        contractType: parsed.contractType,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        financialYear: parsed.financialYear,
        contractValue: String(parsed.contractValue),
        currency: parsed.currency,
        owningDepartment: parsed.owningDepartment ?? null,
        linkedTitleId: parsed.linkedTitleId ?? null,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: contracts.id, contractRef: contracts.contractRef });

    await tx.insert(auditLog).values({
      entity: "contracts",
      entityId: row.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({
        contractRef: row.contractRef,
        title: parsed.title,
        parties: parsed.parties,
        contractType: parsed.contractType,
      }),
    });
    return row;
  });

  // Uploads happen outside the tx (object storage isn't transactional).
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);
  const fileDocTypes = formData.getAll("fileDocTypes") as string[];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `contracts/${inserted.id}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    await db.insert(contractAttachments).values({
      contractId: inserted.id,
      fileName: file.name,
      fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
      fileUrl: objectKey,
      documentType: coerceDocType(fileDocTypes[i]),
      uploadedBy: user.id,
    });
  }

  revalidatePath("/contracts");
  return { contractId: inserted.id, contractRef: inserted.contractRef };
}
