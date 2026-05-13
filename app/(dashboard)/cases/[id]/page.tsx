import { notFound } from "next/navigation";
import { db } from "@/db";
import { caseReferrals, caseReferralTypes, caseActivities, caseProceedings, caseClosure, caseAttachments, casePayments, employers, user } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import CaseDetailClient from "./case-detail-client";
import type { CaseDetail } from "@/db/types";
import { getDownloadUrl } from "@/lib/storage";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db
    .select({
      id: caseReferrals.id,
      employerId: caseReferrals.employerId,
      employerName: employers.name,
      employerCode: employers.code,
      referralDate: caseReferrals.referralDate,
      totalContributions: caseReferrals.totalContributions,
      totalSurcharges: caseReferrals.totalSurcharges,
      wagesRecord: caseReferrals.wagesRecord,
      grandTotalClaim: caseReferrals.grandTotalClaim,
      status: caseReferrals.status,
      assignedTo: caseReferrals.assignedTo,
      createdAt: caseReferrals.createdAt,
      updatedAt: caseReferrals.updatedAt,
      assigneeName: user.name,
      assigneeEmail: user.email,
    })
    .from(caseReferrals)
    .innerJoin(employers, eq(caseReferrals.employerId, employers.id))
    .leftJoin(user, eq(caseReferrals.assignedTo, user.id))
    .where(eq(caseReferrals.id, id));

  if (!row) notFound();

  const [types, activities, proceedings, closureRows, attachmentRows, paymentRows] = await Promise.all([
    db.select().from(caseReferralTypes).where(eq(caseReferralTypes.caseReferralId, id)),

    db
      .select({
        id: caseActivities.id,
        caseReferralId: caseActivities.caseReferralId,
        activityType: caseActivities.activityType,
        notes: caseActivities.notes,
        performedBy: caseActivities.performedBy,
        createdAt: caseActivities.createdAt,
        performerName: user.name,
        performerEmail: user.email,
      })
      .from(caseActivities)
      .leftJoin(user, eq(caseActivities.performedBy, user.id))
      .where(eq(caseActivities.caseReferralId, id))
      .orderBy(desc(caseActivities.createdAt)),

    db
      .select({
        id: caseProceedings.id,
        caseReferralId: caseProceedings.caseReferralId,
        proceedingType: caseProceedings.proceedingType,
        court: caseProceedings.court,
        hearingDate: caseProceedings.hearingDate,
        nextDate: caseProceedings.nextDate,
        outcomeNotes: caseProceedings.outcomeNotes,
        performedBy: caseProceedings.performedBy,
        createdAt: caseProceedings.createdAt,
        performerName: user.name,
        performerEmail: user.email,
      })
      .from(caseProceedings)
      .leftJoin(user, eq(caseProceedings.performedBy, user.id))
      .where(eq(caseProceedings.caseReferralId, id))
      .orderBy(desc(caseProceedings.createdAt)),

    db.select().from(caseClosure).where(eq(caseClosure.caseReferralId, id)),

    db.select().from(caseAttachments)
      .where(eq(caseAttachments.caseReferralId, id))
      .orderBy(asc(caseAttachments.uploadedAt)),

    db.select().from(casePayments)
      .where(eq(casePayments.caseReferralId, id))
      .orderBy(desc(casePayments.paymentDate)),
  ]);

  const documents = await Promise.all(
    attachmentRows.map(async (a) => ({
      ...a,
      presignedUrl: await getDownloadUrl(a.fileUrl),
    }))
  );

  const caseDetail: CaseDetail = {
    ...row,
    types: types.map((t) => t.caseType),
    activities,
    proceedings,
    closure: closureRows[0] ?? null,
    documents,
    payments: paymentRows,
  };

  return <CaseDetailClient caseDetail={caseDetail} />;
}
