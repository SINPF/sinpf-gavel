import { z } from "zod";
import { CURRENCY_VALUES } from "./contract-validator";

export const INSURANCE_POLICY_TYPE_VALUES = ["medical", "property"] as const;

export const INSURANCE_POLICY_DOCUMENT_TYPE_VALUES = [
  "policy_schedule",
  "renewal_notice",
  "claim_document",
  "other",
] as const;

const amount = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  },
  z.number().min(0),
);

const optionalAmount = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  },
  z.number().min(0).nullable(),
);

const insurancePolicyShape = z.object({
  policyNumber: z.string().trim().min(1, "Policy number is required.").max(50),
  insurerName: z.string().trim().min(2, "Insurer name is required.").max(150),
  insurerContact: z.string().trim().max(200).optional().nullable(),
  policyType: z.enum(INSURANCE_POLICY_TYPE_VALUES),
  insuredSubject: z
    .string()
    .trim()
    .min(2, "Insured asset or person is required.")
    .max(200),
  linkedTitleId: z.string().trim().max(50).optional().nullable(),
  coverageStart: z.string().min(1, "Coverage start date is required."),
  coverageEnd: z.string().min(1, "Coverage end date is required."),
  policyValue: amount,
  premiumAmount: optionalAmount,
  currency: z.enum(CURRENCY_VALUES).default("sbd"),
});

export const insertInsurancePolicySchema = insurancePolicyShape.refine(
  (v) => v.coverageEnd > v.coverageStart,
  {
    path: ["coverageEnd"],
    message: "Coverage end date must be after the start date.",
  },
);

export type InsurancePolicyFormValues = z.infer<typeof insertInsurancePolicySchema>;

export const updateInsurancePolicySchema = insurancePolicyShape.partial().extend({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason for this update (10 chars minimum).")
    .max(1000),
});
