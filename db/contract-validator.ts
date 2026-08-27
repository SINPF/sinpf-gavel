import { z } from "zod";

export const CONTRACT_TYPE_VALUES = [
  "lease",
  "service_agreement",
  "mou",
  "supply",
  "consultancy",
  "other",
] as const;

export const CURRENCY_VALUES = ["sbd", "usd", "aud", "nzd", "eur", "other"] as const;

const amount = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  },
  z.number().min(0),
);

const financialYear = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  },
  z
    .number()
    .int()
    .min(2000, "Financial year is out of range.")
    .max(new Date().getFullYear() + 1, "Financial year is out of range."),
);

const contractShape = z.object({
  title: z.string().trim().min(2, "Title is required.").max(200),
  parties: z
    .array(z.string().trim().min(1))
    .min(1, "At least one party besides SINPF is required."),
  contractType: z.enum(CONTRACT_TYPE_VALUES),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  financialYear,
  contractValue: amount,
  currency: z.enum(CURRENCY_VALUES).default("sbd"),
  owningDepartment: z.string().trim().max(100).optional().nullable(),
  linkedTitleId: z.string().trim().max(50).optional().nullable(),
});

export const insertContractSchema = contractShape.refine((v) => v.endDate >= v.startDate, {
  path: ["endDate"],
  message: "End date cannot be before start date.",
});

export type ContractFormValues = z.infer<typeof insertContractSchema>;

export const updateContractSchema = contractShape.partial().extend({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  reason: z.string().trim().min(10, "Give a reason for this update (10 chars minimum).").max(1000),
});

export const terminateContractSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  terminatedDate: z.string().min(1, "Termination date is required."),
  reason: z.string().trim().min(10, "Give a reason for the termination (10 chars minimum).").max(1000),
});
