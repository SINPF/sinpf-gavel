// BR-M3-01: status is DERIVED on read, never stored.
//   EXPIRED        if coverage_end is before today
//   EXPIRING_SOON  if coverage_end falls within the warning window (default 60d)
//   ACTIVE         otherwise
// The register exists to flag upcoming expiries, so deriving on read keeps
// the display honest even if the daily alert job hasn't run today yet.

export type InsurancePolicyStatus = "active" | "expiring_soon" | "expired";

export const INSURANCE_POLICY_STATUS_LABELS: Record<InsurancePolicyStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
};

// FR-M3-004 default warning window. If we ever expose this as configuration,
// this constant is the single edit point.
export const INSURANCE_EXPIRING_WINDOW_DAYS = 60;

export function insurancePolicyStatus(
  row: { coverageEnd: string | null },
  today: string = new Date().toISOString().slice(0, 10),
  windowDays: number = INSURANCE_EXPIRING_WINDOW_DAYS,
): InsurancePolicyStatus {
  if (!row.coverageEnd) return "active";
  if (row.coverageEnd < today) return "expired";
  const horizon = new Date(new Date(today).getTime() + windowDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (row.coverageEnd <= horizon) return "expiring_soon";
  return "active";
}

export function daysToExpiry(
  coverageEnd: string | null,
  today: string = new Date().toISOString().slice(0, 10),
): number | null {
  if (!coverageEnd) return null;
  const a = new Date(coverageEnd).getTime();
  const b = new Date(today).getTime();
  return Math.round((a - b) / 86_400_000);
}
