"use server";

import { db } from "@/db";
import { caseReferrals, caseActivities } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import caseEvents from "@/lib/case-events";

export type CaseStage =
  | "registered"
  | "assessment"
  | "demand_issued"
  | "negotiation"
  | "prosecution"
  | "closed";

export async function updateCaseStage(caseId: string, stage: CaseStage, notes?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const [current] = await db
    .select({ status: caseReferrals.status })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, caseId));

  await db
    .update(caseReferrals)
    .set({ status: stage, updatedAt: new Date() })
    .where(eq(caseReferrals.id, caseId));

  const prevStage = current?.status ?? stage;

  await db.insert(caseActivities).values({
    caseReferralId: caseId,
    activityType: "stage_changed",
    notes: notes ?? `Stage changed from ${prevStage.replace(/_/g, " ")} to ${stage.replace(/_/g, " ")}`,
    performedBy: session.user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  caseEvents.emit("cases:updated");
}
