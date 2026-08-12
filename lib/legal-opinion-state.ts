// BR-M4-01 helpers. State itself is stored on the row (draft | finalised);
// "superseded" is derived from a finalised successor pointing at the row.

export type LegalOpinionState = "draft" | "finalised";

export const LEGAL_OPINION_STATE_LABELS: Record<LegalOpinionState, string> = {
  draft: "Draft",
  finalised: "Finalised",
};

// AC-M4-004.3 — finalisation requires at least one non-withdrawn signed_opinion
// document. Callers pass the current attachments list.
export function isReadyToFinalise(
  docs: { documentType: string; isWithdrawn: boolean }[],
): boolean {
  return docs.some(
    (d) => d.documentType === "signed_opinion" && !d.isWithdrawn,
  );
}

// AC-M4-004.2 — an opinion is superseded when at least one finalised, non-deleted
// successor points at it. Callers pass the list of successors (may be empty).
export function isSuperseded(
  successors: { state: string; isDeleted: boolean }[],
): boolean {
  return successors.some((s) => s.state === "finalised" && !s.isDeleted);
}
