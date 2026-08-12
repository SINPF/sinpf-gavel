"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  insurancePolicies,
  insurancePolicyAttachments,
  insurancePolicyDocumentTypeEnum,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { nextInsurancePolicyRef } from "@/lib/insurance-policy-ref";
import { uploadFile } from "@/lib/storage";
import { insertInsurancePolicySchema } from "@/db/insurance-validator";
import path from "path";

type DocType = (typeof insurancePolicyDocumentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(insurancePolicyDocumentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

// AC-M3-001.3 — a policy number that already exists for the same insurer is
// a warning, not a hard reject. On duplicate we throw an Error whose message
// starts with DUPLICATE_POLICY_NUMBER:<existingRef>; the client parses that
// prefix to render an in-place confirmation panel, then resubmits with
// confirmDuplicate=true. Kept as a plain Error because "use server" files
// only permit exporting async functions.

export async function createInsurancePolicy(formData: FormData) {
  const user = await assertCan("create_insurance_policy");

  const parsed = insertInsurancePolicySchema.parse({
    policyNumber: String(formData.get("policyNumber") ?? "").trim(),
    insurerName: String(formData.get("insurerName") ?? "").trim(),
    insurerContact:
      (formData.get("insurerContact") as string | null)?.trim() || null,
    policyType: String(formData.get("policyType") ?? "medical"),
    insuredSubject: String(formData.get("insuredSubject") ?? "").trim(),
    linkedTitleId:
      (formData.get("linkedTitleId") as string | null)?.trim() || null,
    coverageStart: String(formData.get("coverageStart") ?? ""),
    coverageEnd: String(formData.get("coverageEnd") ?? ""),
    policyValue: formData.get("policyValue") ?? 0,
    premiumAmount: formData.get("premiumAmount") ?? null,
    currency: String(formData.get("currency") ?? "sbd"),
  });

  const confirmDuplicate = formData.get("confirmDuplicate") === "true";
  if (!confirmDuplicate) {
    const [dup] = await db
      .select({ policyRef: insurancePolicies.policyRef })
      .from(insurancePolicies)
      .where(
        and(
          eq(insurancePolicies.insurerName, parsed.insurerName),
          eq(insurancePolicies.policyNumber, parsed.policyNumber),
          eq(insurancePolicies.isDeleted, false),
        ),
      )
      .limit(1);
    if (dup) throw new Error(`DUPLICATE_POLICY_NUMBER:${dup.policyRef}`);
  }

  const now = new Date();
  const inserted = await db.transaction(async (tx) => {
    const policyRef = await nextInsurancePolicyRef(
      tx as unknown as typeof db,
      new Date(parsed.coverageStart).getFullYear(),
    );
    const [row] = await tx
      .insert(insurancePolicies)
      .values({
        policyRef,
        policyNumber: parsed.policyNumber,
        insurerName: parsed.insurerName,
        insurerContact: parsed.insurerContact ?? null,
        policyType: parsed.policyType,
        insuredSubject: parsed.insuredSubject,
        linkedTitleId: parsed.linkedTitleId ?? null,
        coverageStart: parsed.coverageStart,
        coverageEnd: parsed.coverageEnd,
        policyValue: String(parsed.policyValue),
        premiumAmount:
          parsed.premiumAmount === null ? null : String(parsed.premiumAmount),
        currency: parsed.currency,
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: insurancePolicies.id,
        policyRef: insurancePolicies.policyRef,
      });

    await tx.insert(auditLog).values({
      entity: "insurance_policies",
      entityId: row.id,
      action: "create",
      actorId: user.id,
      newValue: JSON.stringify({
        policyRef: row.policyRef,
        insurerName: parsed.insurerName,
        policyNumber: parsed.policyNumber,
        policyType: parsed.policyType,
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
    const objectKey = `insurance/${inserted.id}/${docType}/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    await db.insert(insurancePolicyAttachments).values({
      insurancePolicyId: inserted.id,
      fileName: file.name,
      fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
      fileUrl: objectKey,
      documentType: docType,
      uploadedBy: user.id,
    });
  }

  revalidatePath("/insurance");
  return { policyId: inserted.id, policyRef: inserted.policyRef };
}
