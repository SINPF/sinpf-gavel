import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  caseAttachments,
  casePayments,
  referralAction,
  referralStatusHistory,
  settlementSchedule,
  auditLog,
  employers,
  user,
} from "@/db/schema";
import { assertCan } from "@/lib/rbac";

// FR-M1-019 — case-file export as a multi-sheet XLSX. A future increment
// could bundle documents into a real zip archive; the XLSX summarises
// everything material for external audit today.
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const me = await assertCan("export_case");

  const [row] = await db
    .select()
    .from(caseReferrals)
    .innerJoin(employers, eq(caseReferrals.employerId, employers.id))
    .leftJoin(user, eq(caseReferrals.assignedOfficerId, user.id))
    .where(eq(caseReferrals.id, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [types, actions, statusHistory, docs, payments, schedule, audits] = await Promise.all([
    db.select().from(caseReferralTypes).where(eq(caseReferralTypes.caseReferralId, id)),
    db.select().from(referralAction).where(eq(referralAction.caseReferralId, id)).orderBy(asc(referralAction.actionDate)),
    db.select().from(referralStatusHistory).where(eq(referralStatusHistory.caseReferralId, id)).orderBy(asc(referralStatusHistory.changedAt)),
    db.select().from(caseAttachments).where(eq(caseAttachments.caseReferralId, id)).orderBy(asc(caseAttachments.uploadedAt)),
    db.select().from(casePayments).where(eq(casePayments.caseReferralId, id)).orderBy(asc(casePayments.paymentDate)),
    db.select().from(settlementSchedule).where(eq(settlementSchedule.caseReferralId, id)).orderBy(asc(settlementSchedule.instalmentNo)),
    db.select().from(auditLog).where(and(eq(auditLog.entity, "case_referrals"), eq(auditLog.entityId, id))).orderBy(asc(auditLog.createdAt)),
  ]);

  const summary = [
    { field: "Reference", value: row.case_referrals.referralRef },
    { field: "Employer", value: `${row.employers.name} (${row.employers.code})` },
    { field: "Status", value: row.case_referrals.status },
    { field: "Referral date", value: row.case_referrals.referralDate },
    { field: "Date received", value: row.case_referrals.dateReceived },
    { field: "Assigned officer", value: row.user?.name ?? row.user?.email ?? "" },
    { field: "Case types", value: types.map((t) => t.caseType).join(", ") },
    { field: "Contribution claimed", value: row.case_referrals.contributionAmount },
    { field: "Surcharge claimed", value: row.case_referrals.surchargeAmount },
    { field: "Total claimed", value: row.case_referrals.totalClaimed },
    { field: "Wage periods", value: row.case_referrals.wagesPeriods },
    { field: "Period of default", value: `${row.case_referrals.periodOfDefaultFrom ?? ""} → ${row.case_referrals.periodOfDefaultTo ?? ""}` },
    { field: "Risk flags", value: (row.case_referrals.riskFlags ?? []).join(", ") },
    { field: "Risk note", value: row.case_referrals.riskNote },
    { field: "Outcome", value: row.case_referrals.outcome },
    { field: "Closure reason", value: row.case_referrals.closureReason },
    { field: "Closed at", value: row.case_referrals.closedAt },
    { field: "Exported by", value: me.id },
    { field: "Exported at", value: new Date().toISOString() },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      statusHistory.map((h) => ({
        from: h.fromStatus,
        to: h.toStatus,
        reason: h.reason,
        changedBy: h.changedBy,
        changedAt: h.changedAt,
        approvedBy: h.approvedBy,
      })),
    ),
    "Status history",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      actions.map((a) => ({
        actionType: a.actionType,
        actionDate: a.actionDate,
        notes: a.notes,
        performedBy: a.performedBy,
      })),
    ),
    "Actions",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      payments.map((p) => ({
        date: p.paymentDate,
        contribution: p.amountContribution,
        surcharge: p.amountSurcharge,
        receipt: p.receiptReference,
        reversed: p.isReversed ? "yes" : "no",
        reversalReason: p.reversalReason,
        notes: p.notes,
      })),
    ),
    "Payments",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      schedule.map((s) => ({
        instalment: s.instalmentNo,
        due: s.dueDate,
        amount: s.amountDue,
        state: s.state,
      })),
    ),
    "Schedule",
  );
  // FR-M1-019.2 — withdrawn documents are omitted but summarised.
  const nonWithdrawn = docs.filter((d) => !d.isWithdrawn);
  const withdrawn = docs.filter((d) => d.isWithdrawn);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      nonWithdrawn.map((d) => ({
        fileName: d.fileName,
        type: d.documentType,
        uploadedAt: d.uploadedAt,
        uploadedBy: d.uploadedBy,
        url: d.fileUrl,
      })),
    ),
    "Documents",
  );
  if (withdrawn.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        withdrawn.map((d) => ({
          fileName: d.fileName,
          type: d.documentType,
          withdrawnAt: d.withdrawnAt,
          withdrawnBy: d.withdrawnBy,
          reason: d.withdrawalReason,
        })),
      ),
      "Withdrawn documents",
    );
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      audits.map((a) => ({
        action: a.action,
        field: a.field,
        oldValue: a.oldValue,
        newValue: a.newValue,
        reason: a.reason,
        actor: a.actorId,
        at: a.createdAt,
      })),
    ),
    "Audit trail",
  );

  // Record the export in the audit trail (FR-M1-019.3).
  await db.insert(auditLog).values({
    entity: "case_referrals",
    entityId: id,
    action: "export",
    actorId: me.id,
    newValue: JSON.stringify({ referralRef: row.case_referrals.referralRef }),
  });

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="case_${row.case_referrals.referralRef}.xlsx"`,
    },
  });
}
