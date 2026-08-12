// BR-M2-01: status is DERIVED on read, never stored.
//   TERMINATED  if terminated_date is set
//   EXPIRED     otherwise if end_date is before today
//   ACTIVE      otherwise
// Deriving prevents the register from claiming a contract is "active" years
// after it lapsed — the failure mode a manual status field invites.

export type ContractStatus = "active" | "expired" | "terminated";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "Active",
  expired: "Expired",
  terminated: "Terminated",
};

export function contractStatus(row: {
  endDate: string | null;
  terminatedDate: string | null;
}): ContractStatus {
  if (row.terminatedDate) return "terminated";
  const today = new Date().toISOString().slice(0, 10);
  if (row.endDate && row.endDate < today) return "expired";
  return "active";
}

// FR-M2-002 — a contract needs a signed contract document before it can be
// considered fully-formed. This helper mirrors intake completeness on the
// referral side: a small, side-effect-free boolean the UI shows.
export function isContractComplete(hasSignedDoc: boolean, status: ContractStatus): boolean {
  // Terminated contracts don't have to have a signed doc after the fact,
  // but active ones do. Expired without a signed doc is still incomplete.
  if (status === "terminated") return true;
  return hasSignedDoc;
}
