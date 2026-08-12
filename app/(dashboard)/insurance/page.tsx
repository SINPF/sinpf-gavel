import { db } from "@/db";
import { insurancePolicies, insurancePolicyAttachments } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { currentUser, can } from "@/lib/rbac";
import InsuranceClient from "./insurance-client";

export default async function InsurancePage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_insurance_policy")) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Insurance
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view the insurance register.
        </p>
      </div>
    );
  }

  const scheduleCountSub = db
    .select({
      insurancePolicyId: insurancePolicyAttachments.insurancePolicyId,
      scheduleCount: sql<number>`COUNT(*) FILTER (WHERE ${insurancePolicyAttachments.documentType} = 'policy_schedule' AND ${insurancePolicyAttachments.isWithdrawn} = false)`.as(
        "schedule_count",
      ),
    })
    .from(insurancePolicyAttachments)
    .groupBy(insurancePolicyAttachments.insurancePolicyId)
    .as("schedule_sub");

  const rows = await db
    .select({
      id: insurancePolicies.id,
      policyRef: insurancePolicies.policyRef,
      policyNumber: insurancePolicies.policyNumber,
      insurerName: insurancePolicies.insurerName,
      policyType: insurancePolicies.policyType,
      insuredSubject: insurancePolicies.insuredSubject,
      coverageStart: insurancePolicies.coverageStart,
      coverageEnd: insurancePolicies.coverageEnd,
      policyValue: insurancePolicies.policyValue,
      currency: insurancePolicies.currency,
      linkedTitleId: insurancePolicies.linkedTitleId,
      scheduleCount: scheduleCountSub.scheduleCount,
    })
    .from(insurancePolicies)
    .leftJoin(
      scheduleCountSub,
      eq(scheduleCountSub.insurancePolicyId, insurancePolicies.id),
    )
    .where(eq(insurancePolicies.isDeleted, false))
    .orderBy(asc(insurancePolicies.coverageEnd));

  const canCreate = can(me.role, "create_insurance_policy");

  return (
    <InsuranceClient
      policies={rows.map((r) => ({
        ...r,
        policyValue: r.policyValue ?? "0",
        scheduleCount: Number(r.scheduleCount ?? 0),
      }))}
      canCreate={canCreate}
    />
  );
}
