import { z } from "zod";

export const ENCUMBRANCE_TYPE_VALUES = [
  "lease",
  "mortgage",
  "caveat",
  "easement",
  "other",
] as const;

const encumbranceShape = z.object({
  titleId: z.string().min(1),
  encumbranceType: z.enum(ENCUMBRANCE_TYPE_VALUES),
  holderName: z.string().trim().min(2, "Holder name is required.").max(200),
  registeredDate: z.string().min(1, "Registered date is required."),
  expiryDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
  linkedContractId: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
});

export const insertEncumbranceSchema = encumbranceShape.superRefine((v, ctx) => {
  if (v.expiryDate && v.expiryDate <= v.registeredDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiryDate"],
      message: "Expiry date must be after the registered date.",
    });
  }
});

export type EncumbranceFormValues = z.infer<typeof insertEncumbranceSchema>;

// Note: titleId is excluded from update — you can't reassign an encumbrance
// to a different title.
const encumbranceUpdateShape = z.object({
  encumbranceType: z.enum(ENCUMBRANCE_TYPE_VALUES).optional(),
  holderName: z.string().trim().min(2).max(200).optional(),
  registeredDate: z.string().min(1).optional(),
  expiryDate: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
  linkedContractId: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
});

export const updateEncumbranceSchema = encumbranceUpdateShape.extend({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason for this update (10 chars minimum).")
    .max(1000),
});

// AC-M5-002.2 — discharge requires a date and a supporting document. The
// document is validated by the discharge action (file count > 0 in FormData);
// this schema covers the structured fields only.
export const dischargeEncumbranceSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  dischargedDate: z.string().min(1, "Discharge date is required."),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason for the discharge (10 chars minimum).")
    .max(1000),
});
