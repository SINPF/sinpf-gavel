import { z } from "zod";

export const LEGAL_OPINION_STATE_VALUES = ["draft", "finalised"] as const;

export const LEGAL_OPINION_DOCUMENT_TYPE_VALUES = [
  "signed_opinion",
  "draft_opinion",
  "supporting_material",
  "other",
] as const;

// Keywords: array of trimmed, non-empty, deduped strings, capped at 50 chars each.
const keywordsField = z.preprocess(
  (v) => {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v;
    return String(v)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  z
    .array(z.string().trim().min(1).max(50))
    .max(50, "At most 50 keywords.")
    .transform((arr) => Array.from(new Set(arr))),
);

const legalOpinionShape = z.object({
  subjectMatter: z.string().trim().min(2, "Subject matter is required.").max(250),
  requestingDepartment: z
    .string()
    .trim()
    .min(2, "Requesting department is required.")
    .max(100),
  dateRequested: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
  opinionDate: z.string().min(1, "Opinion date is required."),
  // Optional at the schema level so the client can omit it (server defaults
  // to the creating user per AC-M4-001.2). When present it must be a non-empty
  // user id.
  authorId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
  summary: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
  keywords: keywordsField,
  supersedesOpinionId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v ?? null)),
});

// AC-M4-001.3 — opinion_date cannot be in the future.
export const insertLegalOpinionSchema = legalOpinionShape.refine(
  (v) => v.opinionDate <= new Date().toISOString().slice(0, 10),
  {
    path: ["opinionDate"],
    message: "Opinion date cannot be in the future.",
  },
);

export type LegalOpinionFormValues = z.infer<typeof insertLegalOpinionSchema>;

export const updateLegalOpinionSchema = legalOpinionShape.partial().extend({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason for this update (10 chars minimum).")
    .max(1000),
});

export const finaliseLegalOpinionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
});
