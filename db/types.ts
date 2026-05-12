import { InferSelectModel } from "drizzle-orm";
import {
  caseReferrals,
  caseActivities,
  caseProceedings,
  caseClosure,
  caseAttachments,
  casePayments,
  employers,
} from "./schema";

export type Case = InferSelectModel<typeof caseReferrals>;
export type Employer = InferSelectModel<typeof employers>;

export type CaseWithAssignee = Case & {
  assigneeName: string | null;
  assigneeEmail: string | null;
  employerName: string;
  employerCode: string;
  types: string[];
};

export type CaseAttachment = InferSelectModel<typeof caseAttachments> & { presignedUrl: string };
export type CaseActivity   = InferSelectModel<typeof caseActivities>;
export type CaseProceeding = InferSelectModel<typeof caseProceedings>;
export type CaseClosure    = InferSelectModel<typeof caseClosure>;
export type CasePayment    = InferSelectModel<typeof casePayments>;

export type CaseActivityWithUser = CaseActivity & {
  performerName: string | null;
  performerEmail: string | null;
};

export type CaseProceedingWithUser = CaseProceeding & {
  performerName: string | null;
  performerEmail: string | null;
};

export type CaseDetail = Case & {
  assigneeName: string | null;
  assigneeEmail: string | null;
  employerName: string;
  employerCode: string;
  types: string[];
  activities: CaseActivityWithUser[];
  proceedings: CaseProceedingWithUser[];
  closure: CaseClosure | null;
  documents: CaseAttachment[];
  payments: CasePayment[];
};
