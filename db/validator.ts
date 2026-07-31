import { createInsertSchema } from "drizzle-zod";
import { caseReferrals, employers } from "./schema";
import { z } from "zod";

const baseCaseSchema = createInsertSchema(caseReferrals);

// Amount fields default to `undefined` in the form (so the placeholder shows
// instead of a preset "0"). Coerce undefined/empty/NaN → 0 before validation.
const amountSchema = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  },
  z.number().min(0),
);

export const insertCaseSchema = baseCaseSchema.extend({
  employerId:         z.string().min(1, "Employer is required"),
  totalContributions: amountSchema,
  totalSurcharges:    amountSchema,
  wagesRecord:        amountSchema,
  grandTotalClaim:    amountSchema,
  selectedTypes:      z.array(z.string()).default([]),
});

export type CaseFormValues = z.infer<typeof insertCaseSchema>;

const baseEmployerSchema = createInsertSchema(employers);

export const insertEmployerSchema = baseEmployerSchema.extend({
  name:    z.string().min(1, "Employer name is required"),
  code:    z.string().min(1, "Employer code is required"),
  phone:   z.string().optional(),
  address: z.string().optional(),
});

export type EmployerFormValues = z.infer<typeof insertEmployerSchema>;
