// Spec §7 transition matrix and guards. Server-side enforcement is
// authoritative — the UI merely reflects available_transitions.

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  caseAttachments,
  referralAction,
  casePayments,
} from "@/db/schema";
import { paidToDate } from "@/lib/case-money";

export type Status =
  | "received"
  | "under_assessment"
  | "notice_served"
  | "settlement"
  | "court_prep"
  | "in_court"
  | "paid"
  | "wages_received"
  | "closed"
  | "withdrawn"
  | "not_filed";

export const TERMINAL_STATUSES: readonly Status[] = ["closed", "withdrawn", "not_filed"] as const;
export const REASON_REQUIRED: readonly Status[] = [
  "closed",
  "withdrawn",
  "not_filed",
] as const;

// Rows are the current status, arrays list permitted target statuses.
// Reopen (any terminal → under_assessment) is handled separately.
const TRANSITIONS: Record<Status, Status[]> = {
  received:         ["under_assessment", "withdrawn"],
  under_assessment: ["notice_served", "settlement", "court_prep", "wages_received", "withdrawn", "not_filed"],
  notice_served:    ["settlement", "court_prep", "paid", "wages_received", "withdrawn", "not_filed"],
  settlement:       ["court_prep", "paid", "wages_received", "withdrawn"],
  court_prep:       ["settlement", "in_court", "withdrawn", "not_filed"],
  in_court:         ["settlement", "paid", "wages_received", "closed", "withdrawn"],
  paid:             ["wages_received", "closed"],
  wages_received:   ["court_prep", "paid", "closed"],
  closed:           [], // reopen only
  withdrawn:        [], // reopen only
  not_filed:        [], // reopen only
};

export function permittedTargets(from: Status): Status[] {
  return TRANSITIONS[from] ?? [];
}

export function isTerminal(s: Status): boolean {
  return TERMINAL_STATUSES.includes(s);
}

export function reasonRequired(to: Status): boolean {
  return REASON_REQUIRED.includes(to);
}

export type GuardResult = { allowed: true } | { allowed: false; unmet: string[]; message: string };

// Refuses a transition if the spec's entry conditions aren't met. Reads only
// the fields it needs; safe to call from a read path (e.g. to compute the
// available_transitions list for the case detail page).
export async function evaluateGuard(
  caseId: string,
  to: Status,
  overrides?: {
    courtVenue?: string | null;
    courtCaseNumber?: string | null;
    dateFiled?: string | null;
    outcome?: string | null;
  },
): Promise<GuardResult> {
  const [row] = await db
    .select({
      status: caseReferrals.status,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      totalClaimed: caseReferrals.totalClaimed,
      courtVenue: caseReferrals.courtVenue,
      courtCaseNumber: caseReferrals.courtCaseNumber,
      dateFiled: caseReferrals.dateFiled,
      riskFlags: caseReferrals.riskFlags,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, caseId));
  if (!row) return { allowed: false, unmet: ["referral"], message: "Referral not found" };

  switch (to) {
    case "under_assessment": {
      const unmet: string[] = [];
      if (!row.assignedOfficerId) unmet.push("assigned_officer");
      const [emsDoc] = await db
        .select({ id: caseAttachments.id })
        .from(caseAttachments)
        .where(
          and(
            eq(caseAttachments.caseReferralId, caseId),
            eq(caseAttachments.documentType, "ems_referral_letter"),
            eq(caseAttachments.isWithdrawn, false),
          ),
        )
        .limit(1);
      if (!emsDoc) unmet.push("ems_referral_letter");
      return unmet.length
        ? { allowed: false, unmet, message: "Assign an officer and attach the EMS referral letter." }
        : { allowed: true };
    }

    case "notice_served": {
      const [act] = await db
        .select({ id: referralAction.id })
        .from(referralAction)
        .where(eq(referralAction.caseReferralId, caseId))
        .limit(1);
      const hasNoticeAction = !!act; // any action counts as evidence a notice was recorded
      const [noticeDoc] = await db
        .select({ id: caseAttachments.id })
        .from(caseAttachments)
        .where(
          and(
            eq(caseAttachments.caseReferralId, caseId),
            eq(caseAttachments.documentType, "legal_notice"),
            eq(caseAttachments.isWithdrawn, false),
          ),
        )
        .limit(1);
      const unmet: string[] = [];
      if (!hasNoticeAction) unmet.push("notice_action");
      if (!noticeDoc) unmet.push("legal_notice_document");
      return unmet.length
        ? { allowed: false, unmet, message: "Attach the legal notice before recording it as served." }
        : { allowed: true };
    }

    case "in_court": {
      const unmet: string[] = [];
      if (!(overrides?.courtVenue ?? row.courtVenue)) unmet.push("court_venue");
      if (!(overrides?.courtCaseNumber ?? row.courtCaseNumber)) unmet.push("court_case_number");
      if (!(overrides?.dateFiled ?? row.dateFiled)) unmet.push("date_filed");
      return unmet.length
        ? { allowed: false, unmet, message: "Enter court venue, case number and filing date." }
        : { allowed: true };
    }

    case "paid": {
      const paid = await paidToDate(caseId);
      const outstanding = Math.max(Number(row.totalClaimed ?? 0) - paid, 0);
      if (outstanding > 0) {
        return {
          allowed: false,
          unmet: ["outstanding_balance"],
          message: `Outstanding balance is SBD ${outstanding.toFixed(2)}. Record remaining payments first.`,
        };
      }
      return { allowed: true };
    }

    case "wages_received": {
      const [wagesDoc] = await db
        .select({ id: caseAttachments.id })
        .from(caseAttachments)
        .where(
          and(
            eq(caseAttachments.caseReferralId, caseId),
            eq(caseAttachments.documentType, "wages_record"),
            eq(caseAttachments.isWithdrawn, false),
          ),
        )
        .limit(1);
      return wagesDoc
        ? { allowed: true }
        : { allowed: false, unmet: ["wages_record_document"], message: "Attach the wages record document." };
    }

    case "not_filed": {
      // §7.3: at least one risk flag OR an explicit override reason.
      if (!row.riskFlags || row.riskFlags.length === 0) {
        return {
          allowed: false,
          unmet: ["risk_flag"],
          message: "Set at least one risk flag, or record an override reason.",
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

// BR-M1-08 outcome consistency (used at closure).
export async function checkOutcomeConsistency(
  caseId: string,
  outcome: string,
): Promise<GuardResult> {
  const [row] = await db
    .select({
      totalClaimed: caseReferrals.totalClaimed,
      riskFlags: caseReferrals.riskFlags,
    })
    .from(caseReferrals)
    .where(eq(caseReferrals.id, caseId));
  if (!row) return { allowed: false, unmet: ["referral"], message: "Referral not found" };

  const paid = await paidToDate(caseId);
  const claimed = Number(row.totalClaimed ?? 0);
  const outstanding = Math.max(claimed - paid, 0);
  const [nonReversed] = await db
    .select({ id: casePayments.id })
    .from(casePayments)
    .where(
      and(eq(casePayments.caseReferralId, caseId), eq(casePayments.isReversed, false)),
    )
    .limit(1);
  const hasPayment = !!nonReversed;

  switch (outcome) {
    case "paid_in_full":
      return outstanding === 0
        ? { allowed: true }
        : {
            allowed: false,
            unmet: ["outstanding_balance"],
            message: `Paid in full requires outstanding of zero. Outstanding is SBD ${outstanding.toFixed(2)}.`,
          };
    case "irrecoverable":
      return (row.riskFlags?.length ?? 0) > 0
        ? { allowed: true }
        : { allowed: false, unmet: ["risk_flag"], message: "Irrecoverable requires a risk flag." };
    case "partially_recovered":
      if (!hasPayment)
        return { allowed: false, unmet: ["payment"], message: "Partially recovered requires at least one payment." };
      if (outstanding === 0)
        return { allowed: false, unmet: ["nonzero_balance"], message: "Partially recovered requires a non-zero balance." };
      return { allowed: true };
    default:
      return { allowed: true };
  }
}
