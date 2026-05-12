"use server";

import { db } from "@/db";
import { caseActivities, casePayments, caseReferrals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import caseEvents from "@/lib/case-events";

const UNDOABLE = new Set(["payment_recorded", "note_added", "stage_changed"]);

export async function undoLastAction(caseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const [last] = await db
    .select()
    .from(caseActivities)
    .where(eq(caseActivities.caseReferralId, caseId))
    .orderBy(desc(caseActivities.createdAt))
    .limit(1);

  if (!last || !UNDOABLE.has(last.activityType)) return;

  if (last.activityType === "payment_recorded") {
    const [lastPayment] = await db
      .select()
      .from(casePayments)
      .where(eq(casePayments.caseReferralId, caseId))
      .orderBy(desc(casePayments.createdAt))
      .limit(1);
    if (lastPayment) {
      await db.delete(casePayments).where(eq(casePayments.id, lastPayment.id));
    }
  }

  if (last.activityType === "stage_changed") {
    // Notes format: "Stage changed from X to Y"
    const match = last.notes?.match(/^Stage changed from (.+) to (.+)$/);
    if (match) {
      const prevStage = match[1].replace(/ /g, "_") as typeof caseReferrals.$inferInsert["status"];
      await db
        .update(caseReferrals)
        .set({ status: prevStage, updatedAt: new Date() })
        .where(eq(caseReferrals.id, caseId));
    }
  }

  await db.delete(caseActivities).where(eq(caseActivities.id, last.id));

  const label = last.activityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await db.insert(caseActivities).values({
    caseReferralId: caseId,
    activityType:   "action_undone",
    notes:          `Undid: ${label}${last.notes ? ` — ${last.notes}` : ""}`,
    performedBy:    session.user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  caseEvents.emit("cases:updated");
}
