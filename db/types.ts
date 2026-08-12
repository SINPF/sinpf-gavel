import { InferSelectModel } from "drizzle-orm";
import {
  caseReferrals,
  caseAttachments,
  casePayments,
  referralAction,
  referralStatusHistory,
  settlementSchedule,
  employers,
  userProfile,
} from "./schema";

export type Referral = InferSelectModel<typeof caseReferrals>;
export type Employer = InferSelectModel<typeof employers>;
export type CaseAttachment = InferSelectModel<typeof caseAttachments> & {
  presignedUrl?: string;
};
export type ReferralAction = InferSelectModel<typeof referralAction>;
export type ReferralStatusHistoryRow = InferSelectModel<typeof referralStatusHistory>;
export type SettlementInstalment = InferSelectModel<typeof settlementSchedule>;
export type CasePayment = InferSelectModel<typeof casePayments>;
export type UserProfile = InferSelectModel<typeof userProfile>;

// Denormalised summary row used by list pages and dashboards.
// Only the fields the list actually renders — full Referral is over-fetching.
export type ReferralListRow = {
  id: string;
  referralRef: string;
  employerId: string;
  employerName: string;
  employerCode: string;
  referralDate: string;
  dateReceived: string;
  contributionAmount: string | null;
  surchargeAmount: string | null;
  totalClaimed: string;
  wagesPeriods: string | null;
  status: Referral["status"];
  assignedOfficerId: string | null;
  assignedAt: Date | null;
  lastActivityAt: Date;
  nextCourtDate: string | null;
  responseDueDate: string | null;
  isIntakeComplete: boolean;
  riskFlags: Referral["riskFlags"];
  createdAt: Date;
  updatedAt: Date;
  assigneeName: string | null;
  assigneeEmail: string | null;
  types: string[];
  paidToDate: number;
  outstanding: number;
};

export type ActionWithUser = ReferralAction & {
  performerName: string | null;
  performerEmail: string | null;
};

export type PaymentWithUser = CasePayment & {
  recordedByName: string | null;
  recordedByEmail: string | null;
};

export type StatusHistoryWithUser = ReferralStatusHistoryRow & {
  changedByName: string | null;
  changedByEmail: string | null;
};

export type ReferralDetail = Referral & {
  employerName: string;
  employerCode: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  types: string[];
  actions: ActionWithUser[];
  statusHistory: StatusHistoryWithUser[];
  documents: CaseAttachment[];
  payments: PaymentWithUser[];
  schedule: SettlementInstalment[];
  paidToDate: number;
  outstanding: number;
};

// Back-compat aliases for callers still using old names.
export type Case = Referral;
export type CaseWithAssignee = ReferralListRow;
export type CaseDetail = ReferralDetail;
