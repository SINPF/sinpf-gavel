// Intake completeness per spec §2.2 handover checklist.
//
// A referral is intake-complete when the EMS referral letter is attached AND
// the other soft items (contribution statement, compliance notes, prior
// correspondence, periods of default) are present. The EMS letter blocks
// progression to UNDER_ASSESSMENT (Assumption A-13); the rest are soft flags.

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { caseAttachments, caseReferrals, caseReferralTypes } from "@/db/schema";

export type IntakeChecklist = {
  hasEmsLetter: boolean;
  hasContributionStatement: boolean;
  hasComplianceNote: boolean;
  hasDefaultPeriod: boolean;
  hasWagesPeriods: boolean;
  isComplete: boolean;
  missing: string[];
};

export async function computeIntakeCompleteness(
  caseId: string,
): Promise<IntakeChecklist> {
  const [row] = await db
    .select({
      periodOfDefaultFrom: caseReferrals.periodOfDefaultFrom,
      periodOfDefaultTo: caseReferrals.periodOfDefaultTo,
      wagesPeriods: caseReferrals.wagesPeriods,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, caseId));

  const types = await db
    .select({ caseType: caseReferralTypes.caseType })
    .from(caseReferralTypes)
    .where(eq(caseReferralTypes.caseReferralId, caseId));

  const isWagesRecord = types.some((t) => t.caseType === "wages_record");
  const hasMonetaryType = types.some(
    (t) => t.caseType === "unpaid_contribution" || t.caseType === "unpaid_surcharge",
  );

  const attachments = await db
    .select({ documentType: caseAttachments.documentType })
    .from(caseAttachments)
    .where(
      and(
        eq(caseAttachments.caseReferralId, caseId),
        eq(caseAttachments.isWithdrawn, false),
      ),
    );

  const hasEmsLetter = attachments.some((a) => a.documentType === "ems_referral_letter");
  const hasContributionStatement = attachments.some(
    (a) => a.documentType === "contribution_statement",
  );
  const hasComplianceNote = attachments.some((a) => a.documentType === "compliance_note");
  const hasDefaultPeriod = !!row?.periodOfDefaultFrom && !!row?.periodOfDefaultTo;
  const hasWagesPeriods = !isWagesRecord || !!row?.wagesPeriods;

  const missing: string[] = [];
  if (!hasEmsLetter) missing.push("EMS referral letter");
  if (hasMonetaryType && !hasContributionStatement) missing.push("Contribution statement");
  if (!hasComplianceNote) missing.push("Compliance notes");
  if (!hasDefaultPeriod && hasMonetaryType) missing.push("Period of default");
  if (!hasWagesPeriods) missing.push("Wage periods");

  return {
    hasEmsLetter,
    hasContributionStatement,
    hasComplianceNote,
    hasDefaultPeriod,
    hasWagesPeriods,
    isComplete: missing.length === 0,
    missing,
  };
}

// Cheap recompute-and-persist. Call after any change that could affect intake
// (upload, correction of periods, adding/removing a case type).
export async function refreshIntakeFlag(caseId: string) {
  const result = await computeIntakeCompleteness(caseId);
  await db
    .update(caseReferrals)
    .set({ isIntakeComplete: result.isComplete })
    .where(eq(caseReferrals.id, caseId));
  return result;
}
