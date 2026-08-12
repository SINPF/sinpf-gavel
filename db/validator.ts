import { createInsertSchema } from "drizzle-zod";
import { caseReferrals, employers } from "./schema";
import { z } from "zod";

// Amount fields default to `undefined` in the form (so the placeholder shows
// instead of a preset "0"). Coerce undefined/empty/NaN → null before validation.
const optionalAmount = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  },
  z.number().min(0).nullable(),
);

const baseCaseSchema = createInsertSchema(caseReferrals);

export const CASE_TYPE_VALUES = [
  "unpaid_contribution",
  "unpaid_surcharge",
  "wages_record",
] as const;

export const insertCaseSchema = baseCaseSchema
  .omit({
    id: true,
    referralRef: true,
    totalClaimed: true,
    status: true,
    statusChangedAt: true,
    lastActivityAt: true,
    isIntakeComplete: true,
    outcome: true,
    closureReason: true,
    closedAt: true,
    pendingDecision: true,
    pendingDecisionBy: true,
    pendingDecisionReason: true,
    pendingDecisionAt: true,
    version: true,
    isDeleted: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    assignedAt: true,
  })
  .extend({
    employerId: z.string().min(1, "Employer is required"),
    contributionAmount: optionalAmount,
    surchargeAmount: optionalAmount,
    wagesPeriods: z.string().trim().min(1).max(200).optional().nullable(),
    periodOfDefaultFrom: z.string().optional().nullable(),
    periodOfDefaultTo: z.string().optional().nullable(),
    selectedTypes: z.array(z.enum(CASE_TYPE_VALUES)).min(1, "Select at least one case type"),
  })
  .refine(
    (v) => {
      if (v.selectedTypes.includes("unpaid_contribution")) {
        return v.contributionAmount != null && v.contributionAmount > 0;
      }
      return true;
    },
    { path: ["contributionAmount"], message: "Enter the contribution amount claimed for this case type." },
  )
  .refine(
    (v) => {
      if (v.selectedTypes.includes("unpaid_surcharge")) {
        return v.surchargeAmount != null && v.surchargeAmount > 0;
      }
      return true;
    },
    { path: ["surchargeAmount"], message: "Enter the surcharge amount claimed for this case type." },
  )
  .refine(
    (v) => !v.selectedTypes.includes("wages_record") || (v.wagesPeriods && v.wagesPeriods.trim().length > 0),
    { path: ["wagesPeriods"], message: "Enter the wage periods outstanding." },
  )
  .refine(
    (v) => {
      if (v.periodOfDefaultFrom && v.periodOfDefaultTo) {
        return v.periodOfDefaultTo >= v.periodOfDefaultFrom;
      }
      return true;
    },
    { path: ["periodOfDefaultTo"], message: "The default period end cannot be before its start." },
  );

export type CaseFormValues = z.infer<typeof insertCaseSchema>;

const baseEmployerSchema = createInsertSchema(employers);

export const insertEmployerSchema = baseEmployerSchema.extend({
  name: z.string().min(1, "Employer name is required"),
  code: z.string().min(1, "Employer code is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type EmployerFormValues = z.infer<typeof insertEmployerSchema>;

// Correction schema (FR-M1-018): reason is mandatory.
export const correctReferralSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
    employerId: z.string().min(1).optional(),
    contributionAmount: optionalAmount.optional(),
    surchargeAmount: optionalAmount.optional(),
    wagesPeriods: z.string().trim().max(200).optional().nullable(),
    periodOfDefaultFrom: z.string().optional().nullable(),
    periodOfDefaultTo: z.string().optional().nullable(),
    selectedTypes: z.array(z.enum(CASE_TYPE_VALUES)).optional(),
    reason: z.string().min(10, "Give a reason for this correction (10 chars minimum).").max(1000),
  })
  .refine(
    (v) => {
      if (v.periodOfDefaultFrom && v.periodOfDefaultTo) {
        return v.periodOfDefaultTo >= v.periodOfDefaultFrom;
      }
      return true;
    },
    { path: ["periodOfDefaultTo"], message: "The default period end cannot be before its start." },
  );

export type CorrectReferralValues = z.infer<typeof correctReferralSchema>;
