"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userNotificationPref } from "@/db/schema";
import { requireUser } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

// FR-M1-022 — per-user notification preferences.
// In-app notifications cannot be disabled; only email and digest are settable.
export async function updateNotificationPrefs(input: {
  emailNewReferral?: boolean;
  emailDeadline?: boolean;
  emailInactivity?: boolean;
  emailUnassigned?: boolean;
  emailMissedInstalment?: boolean;
  digestMode?: "individual" | "daily_digest";
}) {
  const me = await requireUser();
  await db
    .insert(userNotificationPref)
    .values({
      userId: me.id,
      emailNewReferral: input.emailNewReferral ?? true,
      emailDeadline: input.emailDeadline ?? true,
      emailInactivity: input.emailInactivity ?? true,
      emailUnassigned: input.emailUnassigned ?? true,
      emailMissedInstalment: input.emailMissedInstalment ?? true,
      digestMode: input.digestMode ?? "individual",
    })
    .onConflictDoUpdate({
      target: userNotificationPref.userId,
      set: {
        emailNewReferral: input.emailNewReferral ?? true,
        emailDeadline: input.emailDeadline ?? true,
        emailInactivity: input.emailInactivity ?? true,
        emailUnassigned: input.emailUnassigned ?? true,
        emailMissedInstalment: input.emailMissedInstalment ?? true,
        digestMode: input.digestMode ?? "individual",
      },
    });
  revalidatePath("/settings/notifications");
}
