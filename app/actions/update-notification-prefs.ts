"use server";

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
  emailContractExpiry?: boolean;
  emailInsuranceExpiry?: boolean;
  digestMode?: "individual" | "daily_digest";
}) {
  const me = await requireUser();
  const values = {
    emailNewReferral: input.emailNewReferral ?? true,
    emailDeadline: input.emailDeadline ?? true,
    emailInactivity: input.emailInactivity ?? true,
    emailUnassigned: input.emailUnassigned ?? true,
    emailMissedInstalment: input.emailMissedInstalment ?? true,
    emailContractExpiry: input.emailContractExpiry ?? true,
    emailInsuranceExpiry: input.emailInsuranceExpiry ?? true,
    digestMode: input.digestMode ?? "individual",
  } as const;
  await db
    .insert(userNotificationPref)
    .values({ userId: me.id, ...values })
    .onConflictDoUpdate({ target: userNotificationPref.userId, set: values });
  revalidatePath("/settings/notifications");
}
