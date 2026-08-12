"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  encumbrances,
  titleAttachments,
  auditLog,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/rbac";
import { uploadFile } from "@/lib/storage";
import { dischargeEncumbranceSchema } from "@/db/encumbrance-validator";
import path from "path";

// FR-M5-002 / AC-M5-002.2 — discharge an encumbrance. Requires:
//   1. MLS role (see rbac MATRIX)
//   2. A discharge date
//   3. At least one supporting document (stored as discharge_document scoped
//      to this encumbrance)
//   4. A reason of at least 10 characters
// One-way transition — discharged encumbrances remain in history and cannot
// be edited (enforced by update-encumbrance.ts).
export async function dischargeEncumbrance(formData: FormData) {
  const user = await assertCan("discharge_encumbrance");

  const parsed = dischargeEncumbranceSchema.parse({
    id: String(formData.get("id") ?? ""),
    version: Number(formData.get("version") ?? 0),
    dischargedDate: String(formData.get("dischargedDate") ?? ""),
    reason: String(formData.get("reason") ?? "").trim(),
  });

  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);
  if (files.length === 0) {
    throw new Error("Attach the supporting discharge document before saving.");
  }

  const [current] = await db
    .select()
    .from(encumbrances)
    .where(eq(encumbrances.id, parsed.id));
  if (!current) throw new Error("Encumbrance not found.");
  if (current.state === "discharged") {
    throw new Error("This encumbrance is already discharged.");
  }
  if (current.version !== parsed.version) throw new Error("STALE_RECORD");
  if (parsed.dischargedDate < current.registeredDate) {
    throw new Error("Discharge date cannot be before the registered date.");
  }

  const now = new Date();
  // Upload documents outside the transaction (object storage isn't
  // transactional), then flip the state atomically with the attachment rows
  // and the audit entry.
  const uploaded: { objectKey: string; fileName: string; fileType: string }[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const objectKey = `titles/${current.titleId}/encumbrances/${current.id}/discharge_document/${safeName}`;
    await uploadFile(objectKey, file);
    const ext = path.extname(file.name).slice(1).toLowerCase();
    uploaded.push({
      objectKey,
      fileName: file.name,
      fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
    });
  }

  await db.transaction(async (tx) => {
    const result = await tx
      .update(encumbrances)
      .set({
        state: "discharged",
        dischargedDate: parsed.dischargedDate,
        dischargedBy: user.id,
        dischargeReason: parsed.reason,
        updatedBy: user.id,
        updatedAt: now,
        version: sql`${encumbrances.version} + 1`,
      })
      .where(
        and(
          eq(encumbrances.id, parsed.id),
          eq(encumbrances.version, parsed.version),
          eq(encumbrances.state, "active"),
        ),
      )
      .returning({ id: encumbrances.id });
    if (result.length === 0) throw new Error("STALE_RECORD");

    for (const u of uploaded) {
      await tx.insert(titleAttachments).values({
        titleId: current.titleId,
        encumbranceId: current.id,
        fileName: u.fileName,
        fileType: u.fileType,
        fileUrl: u.objectKey,
        documentType: "discharge_document",
        uploadedBy: user.id,
      });
    }

    await tx.insert(auditLog).values({
      entity: "encumbrances",
      entityId: parsed.id,
      action: "discharge",
      field: "state",
      oldValue: "active",
      newValue: "discharged",
      actorId: user.id,
      reason: parsed.reason,
    });
  });

  revalidatePath(`/titles/${current.titleId}`);
  revalidatePath("/titles");
}
