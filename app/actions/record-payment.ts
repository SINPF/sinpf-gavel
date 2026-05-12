"use server";

import { db } from "@/db";
import { casePayments, caseActivities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import caseEvents from "@/lib/case-events";

export async function recordPayment(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const caseId            = formData.get("caseId") as string;
  const paymentDate       = formData.get("paymentDate") as string;
  const contributionsPaid = (formData.get("contributionsPaid") as string) || "0";
  const surchargesPaid    = (formData.get("surchargesPaid")    as string) || "0";
  const wagesPaid         = (formData.get("wagesPaid")         as string) || "0";
  const reference         = (formData.get("reference") as string) || null;
  const notes             = (formData.get("notes")    as string) || null;

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

  const total = parseFloat(contributionsPaid) + parseFloat(surchargesPaid) + parseFloat(wagesPaid);
  const formattedTotal = total.toLocaleString("en-AU", { style: "currency", currency: "SBD" });

  await db.insert(caseActivities).values({
    caseReferralId: caseId,
    activityType:   "payment_recorded",
    notes:          `Payment of ${formattedTotal} recorded${reference ? ` (Ref: ${reference})` : ""}`,
    performedBy:    session.user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  caseEvents.emit("cases:updated");
}
