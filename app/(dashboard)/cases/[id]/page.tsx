import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  caseAttachments,
  casePayments,
  referralAction,
  referralStatusHistory,
  settlementSchedule,
  employers,
  user,
} from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import CaseDetailClient from "./case-detail-client";
import type { ReferralDetail } from "@/db/types";
import { getDownloadUrl } from "@/lib/storage";
import { paidToDate as computePaidToDate } from "@/lib/case-money";
import { alias } from "drizzle-orm/pg-core";

const performerUser = alias(user, "performer_user");
const statusChangerUser = alias(user, "status_changer_user");
const paymentRecorderUser = alias(user, "payment_recorder_user");

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db
    .select({
      id: caseReferrals.id,
      referralRef: caseReferrals.referralRef,
      employerId: caseReferrals.employerId,
      employerName: employers.name,
      employerCode: employers.code,
      referralDate: caseReferrals.referralDate,
      dateReceived: caseReferrals.dateReceived,
      contributionAmount: caseReferrals.contributionAmount,
      surchargeAmount: caseReferrals.surchargeAmount,
      totalClaimed: caseReferrals.totalClaimed,
      wagesPeriods: caseReferrals.wagesPeriods,
      periodOfDefaultFrom: caseReferrals.periodOfDefaultFrom,
      periodOfDefaultTo: caseReferrals.periodOfDefaultTo,
      status: caseReferrals.status,
      statusChangedAt: caseReferrals.statusChangedAt,
      lastActivityAt: caseReferrals.lastActivityAt,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      assignedAt: caseReferrals.assignedAt,
      courtVenue: caseReferrals.courtVenue,
      courtCaseNumber: caseReferrals.courtCaseNumber,
      dateFiled: caseReferrals.dateFiled,
      nextCourtDate: caseReferrals.nextCourtDate,
      responseDueDate: caseReferrals.responseDueDate,
      riskFlags: caseReferrals.riskFlags,
      riskNote: caseReferrals.riskNote,
      isIntakeComplete: caseReferrals.isIntakeComplete,
      outcome: caseReferrals.outcome,
      closureReason: caseReferrals.closureReason,
      closedAt: caseReferrals.closedAt,
      pendingDecision: caseReferrals.pendingDecision,
      pendingDecisionBy: caseReferrals.pendingDecisionBy,
      pendingDecisionReason: caseReferrals.pendingDecisionReason,
      pendingDecisionAt: caseReferrals.pendingDecisionAt,
      version: caseReferrals.version,
      isDeleted: caseReferrals.isDeleted,
      createdAt: caseReferrals.createdAt,
      createdBy: caseReferrals.createdBy,
      updatedAt: caseReferrals.updatedAt,
      updatedBy: caseReferrals.updatedBy,
      assigneeName: user.name,
      assigneeEmail: user.email,
    })
    .from(caseReferrals)
    .innerJoin(employers, eq(caseReferrals.employerId, employers.id))
    .leftJoin(user, eq(caseReferrals.assignedOfficerId, user.id))
    .where(eq(caseReferrals.id, id));

  if (!row) notFound();

  const [types, actionRows, statusHistoryRows, attachmentRows, paymentRows, scheduleRows] =
    await Promise.all([
      db
        .select()
        .from(caseReferralTypes)
        .where(eq(caseReferralTypes.caseReferralId, id)),

      db
        .select({
          id: referralAction.id,
          caseReferralId: referralAction.caseReferralId,
          actionType: referralAction.actionType,
          actionDate: referralAction.actionDate,
          notes: referralAction.notes,
          performedBy: referralAction.performedBy,
          documentId: referralAction.documentId,
          createdAt: referralAction.createdAt,
          performerName: performerUser.name,
          performerEmail: performerUser.email,
        })
        .from(referralAction)
        .leftJoin(performerUser, eq(referralAction.performedBy, performerUser.id))
        .where(eq(referralAction.caseReferralId, id))
        .orderBy(desc(referralAction.actionDate)),

      db
        .select({
          id: referralStatusHistory.id,
          caseReferralId: referralStatusHistory.caseReferralId,
          fromStatus: referralStatusHistory.fromStatus,
          toStatus: referralStatusHistory.toStatus,
          reason: referralStatusHistory.reason,
          changedBy: referralStatusHistory.changedBy,
          changedAt: referralStatusHistory.changedAt,
          approvedBy: referralStatusHistory.approvedBy,
          changedByName: statusChangerUser.name,
          changedByEmail: statusChangerUser.email,
        })
        .from(referralStatusHistory)
        .leftJoin(statusChangerUser, eq(referralStatusHistory.changedBy, statusChangerUser.id))
        .where(eq(referralStatusHistory.caseReferralId, id))
        .orderBy(desc(referralStatusHistory.changedAt)),

      db
        .select()
        .from(caseAttachments)
        .where(and(eq(caseAttachments.caseReferralId, id), eq(caseAttachments.isWithdrawn, false)))
        .orderBy(asc(caseAttachments.uploadedAt)),

      db
        .select({
          id: casePayments.id,
          caseReferralId: casePayments.caseReferralId,
          paymentDate: casePayments.paymentDate,
          amountContribution: casePayments.amountContribution,
          amountSurcharge: casePayments.amountSurcharge,
          receiptReference: casePayments.receiptReference,
          scheduleId: casePayments.scheduleId,
          isReversed: casePayments.isReversed,
          reversalReason: casePayments.reversalReason,
          reversedBy: casePayments.reversedBy,
          reversedAt: casePayments.reversedAt,
          notes: casePayments.notes,
          recordedBy: casePayments.recordedBy,
          createdAt: casePayments.createdAt,
          recordedByName: paymentRecorderUser.name,
          recordedByEmail: paymentRecorderUser.email,
        })
        .from(casePayments)
        .leftJoin(paymentRecorderUser, eq(casePayments.recordedBy, paymentRecorderUser.id))
        .where(eq(casePayments.caseReferralId, id))
        .orderBy(desc(casePayments.paymentDate)),

      db
        .select()
        .from(settlementSchedule)
        .where(eq(settlementSchedule.caseReferralId, id))
        .orderBy(asc(settlementSchedule.instalmentNo)),
    ]);

  const documents = await Promise.all(
    attachmentRows.map(async (a) => ({
      ...a,
      presignedUrl: await getDownloadUrl(a.fileUrl),
    })),
  );

  const paid = await computePaidToDate(id);
  const claimed = Number(row.totalClaimed ?? 0);
  const outstanding = Math.max(claimed - paid, 0);

  const referralDetail: ReferralDetail = {
    ...row,
    types: types.map((t) => t.caseType),
    actions: actionRows,
    statusHistory: statusHistoryRows,
    documents,
    payments: paymentRows,
    schedule: scheduleRows,
    paidToDate: paid,
    outstanding,
  };

  return <CaseDetailClient referral={referralDetail} />;
}
