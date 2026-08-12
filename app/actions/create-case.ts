"use server";

import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  caseAttachments,
  referralStatusHistory,
  auditLog,
  documentTypeEnum,
} from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import caseEvents from "@/lib/case-events";
import { nextReferralRef } from "@/lib/referral-ref";
import { refreshIntakeFlag } from "@/lib/intake";
import { totalClaimed } from "@/lib/case-money";
import { CASE_TYPE_VALUES } from "@/db/validator";
import path from "path";

// Human-friendly type labels on the form → spec codes.
const TYPE_MAP: Record<string, (typeof CASE_TYPE_VALUES)[number]> = {
  "Unpaid contributions": "unpaid_contribution",
  "Unpaid surcharges": "unpaid_surcharge",
  "Wages record": "wages_record",
  unpaid_contribution: "unpaid_contribution",
  unpaid_surcharge: "unpaid_surcharge",
  wages_record: "wages_record",
};

type DocType = (typeof documentTypeEnum.enumValues)[number];
const DOC_TYPES = new Set<string>(documentTypeEnum.enumValues);
function coerceDocType(v: string | null | undefined): DocType {
  return v && DOC_TYPES.has(v) ? (v as DocType) : "other";
}

export async function createCase(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const employerId = String(formData.get("employerId") ?? "");
  if (!employerId) throw new Error("Employer is required");

  const referralDate = (formData.get("referralDate") as string) || null;
  const dateReceived = (formData.get("dateReceived") as string) || referralDate;
  const contributionRaw = String(formData.get("contributionAmount") ?? formData.get("totalContributions") ?? "");
  const surchargeRaw = String(formData.get("surchargeAmount") ?? formData.get("totalSurcharges") ?? "");
  const wagesPeriods = (formData.get("wagesPeriods") as string | null)?.trim() || null;
  const periodOfDefaultFrom = (formData.get("periodOfDefaultFrom") as string | null) || null;
  const periodOfDefaultTo = (formData.get("periodOfDefaultTo") as string | null) || null;
  const formAssignee = (formData.get("assignedTo") as string | null)?.trim();

  const contributionAmount = contributionRaw && contributionRaw !== "" ? Number(contributionRaw) : null;
  const surchargeAmount = surchargeRaw && surchargeRaw !== "" ? Number(surchargeRaw) : null;

  const selectedTypesRaw = formData.getAll("selectedTypes") as string[];
  const selectedTypes = Array.from(
    new Set(selectedTypesRaw.map((t) => TYPE_MAP[t]).filter((t): t is (typeof CASE_TYPE_VALUES)[number] => !!t)),
  );
  if (selectedTypes.length === 0) throw new Error("Select at least one case type");

  const total = totalClaimed(contributionAmount, surchargeAmount);
  const assignedOfficerId = formAssignee || null;
  const now = new Date();

  const newCase = await db.transaction(async (tx) => {
    const referralRef = await nextReferralRef(
      tx as unknown as typeof db,
      referralDate ? new Date(referralDate).getFullYear() : now.getFullYear(),
    );

    const [inserted] = await tx
      .insert(caseReferrals)
      .values({
        referralRef,
        employerId,
        referralDate: referralDate ?? undefined,
        dateReceived: dateReceived ?? undefined,
        contributionAmount: contributionAmount != null ? String(contributionAmount) : null,
        surchargeAmount: surchargeAmount != null ? String(surchargeAmount) : null,
        totalClaimed: String(total),
        wagesPeriods,
        periodOfDefaultFrom: periodOfDefaultFrom ?? undefined,
        periodOfDefaultTo: periodOfDefaultTo ?? undefined,
        assignedOfficerId,
        assignedAt: assignedOfficerId ? now : null,
        status: "received",
        statusChangedAt: now,
        lastActivityAt: now,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({ id: caseReferrals.id, referralRef: caseReferrals.referralRef });

    await tx.insert(caseReferralTypes).values(
      selectedTypes.map((t) => ({ caseReferralId: inserted.id, caseType: t })),
    );

    // Opening status-history row per §5.2 (from_status null).
    await tx.insert(referralStatusHistory).values({
      caseReferralId: inserted.id,
      fromStatus: null,
      toStatus: "received",
      changedBy: session.user.id,
    });

    await tx.insert(auditLog).values({
      entity: "case_referrals",
      entityId: inserted.id,
      action: "create",
      actorId: session.user.id,
      newValue: JSON.stringify({
        referralRef: inserted.referralRef,
        employerId,
        selectedTypes,
        contributionAmount,
        surchargeAmount,
        totalClaimed: total,
      }),
    });

    return inserted;
  });

  // Uploads happen outside the tx (object storage isn't transactional).
  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);
  const fileDocTypes = formData.getAll("fileDocTypes") as string[];
  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const objectKey = `cases/${newCase.id}/${safeName}`;
      await uploadFile(objectKey, file);
      const ext = path.extname(file.name).slice(1).toLowerCase();
      await db.insert(caseAttachments).values({
        caseReferralId: newCase.id,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
        fileUrl: objectKey,
        documentType: coerceDocType(fileDocTypes[i]),
        uploadedBy: session.user.id,
      });
    }
  }

  await refreshIntakeFlag(newCase.id);

  revalidatePath("/cases");
  caseEvents.emit("cases:updated");

  return { caseId: newCase.id, referralRef: newCase.referralRef };
}
