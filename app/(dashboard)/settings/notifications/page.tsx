import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userNotificationPref } from "@/db/schema";
import { currentUser } from "@/lib/rbac";
import { redirect } from "next/navigation";
import NotificationPrefsClient from "./notifications-client";

export default async function NotificationPrefsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");

  const [prefs] = await db
    .select()
    .from(userNotificationPref)
    .where(eq(userNotificationPref.userId, me.id));

  const initial = prefs ?? {
    userId: me.id,
    emailNewReferral: true,
    emailDeadline: true,
    emailInactivity: true,
    emailUnassigned: true,
    emailMissedInstalment: true,
    emailContractExpiry: true,
    digestMode: "individual" as const,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Notification preferences
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which alerts you receive by email. In-app notifications cannot be
          disabled — no alert can be silently suppressed.
        </p>
      </div>
      <NotificationPrefsClient
        initial={{
          emailNewReferral: initial.emailNewReferral,
          emailDeadline: initial.emailDeadline,
          emailInactivity: initial.emailInactivity,
          emailUnassigned: initial.emailUnassigned,
          emailMissedInstalment: initial.emailMissedInstalment,
          emailContractExpiry: initial.emailContractExpiry,
          digestMode: initial.digestMode as "individual" | "daily_digest",
        }}
      />
    </div>
  );
}
