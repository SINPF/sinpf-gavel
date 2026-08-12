import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { insurancePolicies, insurancePolicyAttachments, user } from "@/db/schema";
import { currentUser, can } from "@/lib/rbac";
import { getDownloadUrl } from "@/lib/storage";
import InsuranceDetailClient from "./insurance-detail-client";

export default async function InsuranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_insurance_policy")) redirect("/insurance");

  const [row] = await db
    .select({
      id: insurancePolicies.id,
      policyRef: insurancePolicies.policyRef,
      policyNumber: insurancePolicies.policyNumber,
      insurerName: insurancePolicies.insurerName,
      insurerContact: insurancePolicies.insurerContact,
      policyType: insurancePolicies.policyType,
      insuredSubject: insurancePolicies.insuredSubject,
      linkedTitleId: insurancePolicies.linkedTitleId,
      coverageStart: insurancePolicies.coverageStart,
      coverageEnd: insurancePolicies.coverageEnd,
      policyValue: insurancePolicies.policyValue,
      premiumAmount: insurancePolicies.premiumAmount,
      currency: insurancePolicies.currency,
      version: insurancePolicies.version,
      createdAt: insurancePolicies.createdAt,
      updatedAt: insurancePolicies.updatedAt,
      createdByName: user.name,
    })
    .from(insurancePolicies)
    .leftJoin(user, eq(user.id, insurancePolicies.createdBy))
    .where(eq(insurancePolicies.id, id));
  if (!row) notFound();

  const attachments = await db
    .select()
    .from(insurancePolicyAttachments)
    .where(
      and(
        eq(insurancePolicyAttachments.insurancePolicyId, id),
        eq(insurancePolicyAttachments.isWithdrawn, false),
      ),
    )
    .orderBy(asc(insurancePolicyAttachments.uploadedAt));

  const documents = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      presignedUrl: await getDownloadUrl(a.fileUrl),
    })),
  );

  const permissions = {
    update: can(me.role, "update_insurance_policy"),
    upload: can(me.role, "upload_insurance_document"),
    withdraw: can(me.role, "withdraw_insurance_document"),
  };

  return (
    <InsuranceDetailClient policy={row} documents={documents} permissions={permissions} />
  );
}
