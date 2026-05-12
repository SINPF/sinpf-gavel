"use server";

import { db } from "@/db";
import { casePayments, caseActivities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import caseEvents from "@/lib/case-events";

const TYPE_LABELS: Record<string, string> = {
  unpaid_contributions: "Unpaid Contributions",
  unpaid_surcharges:    "Unpaid Surcharges",
  wages_record:         "Wages Record",
};

export async function recordPayment(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const caseId      = formData.get("caseId")      as string;
  const paymentDate = formData.get("paymentDate")  as string;
  const caseType    = formData.get("caseType")     as string;
  const amount      = formData.get("amount")       as string;
  const reference   = (formData.get("reference")   as string) || null;
  const notes       = (formData.get("notes")       as string) || null;

  const contributionsPaid = caseType === "unpaid_contributions" ? amount : "0";
  const surchargesPaid    = caseType === "unpaid_surcharges"    ? amount : "0";
  const wagesPaid         = caseType === "wages_record"         ? amount : "0";

  await db.insert(casePayments).values({
    caseReferralId: caseId,
    paymentDate,
    contributionsPaid,
    surchargesPaid,
    wagesPaid,
    reference,
    notes,
    recordedBy: session.user.id,
  });

  const formattedAmount = parseFloat(amount).toLocaleString("en-AU", { style: "currency", currency: "SBD" });
  const typeLabel = TYPE_LABELS[caseType] ?? caseType;

  await db.insert(caseActivities).values({
    caseReferralId: caseId,
    activityType:   "payment_recorded",
    notes:          `Payment of ${formattedAmount} against ${typeLabel}${reference ? ` (Ref: ${reference})` : ""}`,
    performedBy:    session.user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  caseEvents.emit("cases:updated");
}
