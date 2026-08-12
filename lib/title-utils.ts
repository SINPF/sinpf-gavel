// Labels + small helpers for Module 5. Kept together because titles and
// encumbrances are always displayed side-by-side.

export type TitleOwnershipType =
  | "perpetual_estate"
  | "fixed_term_estate"
  | "leasehold_interest"
  | "other";

export const TITLE_OWNERSHIP_TYPE_LABELS: Record<TitleOwnershipType, string> = {
  perpetual_estate: "Perpetual estate",
  fixed_term_estate: "Fixed-term estate",
  leasehold_interest: "Leasehold interest",
  other: "Other",
};

export type EncumbranceType = "lease" | "mortgage" | "caveat" | "easement" | "other";

export const ENCUMBRANCE_TYPE_LABELS: Record<EncumbranceType, string> = {
  lease: "Lease",
  mortgage: "Mortgage",
  caveat: "Caveat",
  easement: "Easement",
  other: "Other",
};

export type EncumbranceState = "active" | "discharged";

export const ENCUMBRANCE_STATE_LABELS: Record<EncumbranceState, string> = {
  active: "Active",
  discharged: "Discharged",
};

export type TitleDocumentType =
  | "title_deed"
  | "certificate_of_title"
  | "survey_plan"
  | "encumbrance_document"
  | "discharge_document"
  | "other";

export const TITLE_DOCUMENT_TYPE_LABELS: Record<TitleDocumentType, string> = {
  title_deed: "Title deed",
  certificate_of_title: "Certificate of title",
  survey_plan: "Survey plan",
  encumbrance_document: "Encumbrance document",
  discharge_document: "Discharge document",
  other: "Other",
};

// AC-M5-002.3 — a title is encumbered when it carries at least one active
// encumbrance. Callers pass the pre-computed count from the list query.
export function hasActiveEncumbrance(row: { activeEncumbranceCount: number }): boolean {
  return row.activeEncumbranceCount > 0;
}

// Fixed-term titles expire. Not yet alert-integrated (SRS §10 doesn't call
// for it), but the register UI can flag imminent expiries.
export function isFixedTermExpiring(
  row: { ownershipType: string; termEnd: string | null },
  windowDays: number = 90,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (row.ownershipType !== "fixed_term_estate" || !row.termEnd) return false;
  if (row.termEnd < today) return false;
  const horizon = new Date(new Date(today).getTime() + windowDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return row.termEnd <= horizon;
}
