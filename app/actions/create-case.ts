"use server";

import { db } from "@/db";
import { caseReferrals, caseReferralTypes, caseAttachments } from "@/db/schema";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import caseEvents from "@/lib/case-events";
import path from "path";

const TYPE_MAP: Record<string, "unpaid_contributions" | "unpaid_surcharges" | "wages_record"> = {
  "Unpaid contributions": "unpaid_contributions",
  "Unpaid surcharges": "unpaid_surcharges",
  "Wages record": "wages_record",
};

export async function createCase(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const [newCase] = await db
    .insert(caseReferrals)
    .values({
      employerId:   formData.get("employerId")   as string,
      referralDate: formData.get("referralDate") as string,
      totalContributions: formData.get("totalContributions") as string,
      totalSurcharges: formData.get("totalSurcharges") as string,
      wagesRecord: formData.get("wagesRecord") as string,
      grandTotalClaim: formData.get("grandTotalClaim") as string,
      assignedTo: session.user.id,
    })
    .returning({ id: caseReferrals.id });

  const selectedTypes = formData.getAll("selectedTypes") as string[];
  if (selectedTypes.length > 0) {
    await db.insert(caseReferralTypes).values(
      selectedTypes
        .filter((t) => TYPE_MAP[t])
        .map((t) => ({ caseReferralId: newCase.id, caseType: TYPE_MAP[t] }))
    );
  }

  const files = (formData.getAll("files") as File[]).filter((f) => f.size > 0);
  if (files.length > 0) {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const objectKey = `cases/${newCase.id}/${safeName}`;
      await uploadFile(objectKey, file);

      const ext = path.extname(file.name).slice(1).toLowerCase();
      await db.insert(caseAttachments).values({
        caseReferralId: newCase.id,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : ext === "csv" ? "csv" : "excel",
        fileUrl: objectKey,
      });
    }
  }

  revalidatePath("/cases");
  caseEvents.emit("cases:updated");

  return { caseId: newCase.id };
}
