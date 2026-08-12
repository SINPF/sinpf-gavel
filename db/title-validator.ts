import { z } from "zod";

export const TITLE_OWNERSHIP_TYPE_VALUES = [
  "perpetual_estate",
  "fixed_term_estate",
  "leasehold_interest",
  "other",
] as const;

export const TITLE_DOCUMENT_TYPE_VALUES = [
  "title_deed",
  "certificate_of_title",
  "survey_plan",
  "encumbrance_document",
  "discharge_document",
  "other",
] as const;

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v ?? null));

const titleShape = z.object({
  titleNumber: z.string().trim().min(1, "Title number is required.").max(50),
  location: z.string().trim().min(2, "Location is required.").max(200),
  ownershipType: z.enum(TITLE_OWNERSHIP_TYPE_VALUES),
  registeredOwner: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
  termStart: optionalDate,
  termEnd: optionalDate,
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
});

// AC-M5-001.3 — fixed_term_estate requires termStart AND termEnd, and
// termEnd must be after termStart. For other ownership types the dates
// are ignored (may be present but not required).
export const insertTitleSchema = titleShape.superRefine((v, ctx) => {
  if (v.ownershipType === "fixed_term_estate") {
    if (!v.termStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termStart"],
        message: "Term start date is required for fixed-term estates.",
      });
    }
    if (!v.termEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termEnd"],
        message: "Term end date is required for fixed-term estates.",
      });
    }
    if (v.termStart && v.termEnd && v.termEnd <= v.termStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termEnd"],
        message: "Term end date must be after the start date.",
      });
    }
  }
});

export type TitleFormValues = z.infer<typeof insertTitleSchema>;

export const updateTitleSchema = titleShape.partial().extend({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason for this update (10 chars minimum).")
    .max(1000),
});
