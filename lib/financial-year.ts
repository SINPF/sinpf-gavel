// Australian FY convention: July–June, labelled by the starting calendar year.
// Storage is a single integer (the FY's starting year), so 2024 ⇒ "FY 2024/25"
// covering 1 Jul 2024 – 30 Jun 2025.

export function financialYearOfDate(iso: string): number {
  // iso is yyyy-MM-dd. Parse without timezone drift.
  const [y, m] = iso.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) {
    return new Date().getFullYear();
  }
  return m >= 7 ? y : y - 1;
}

export function formatFinancialYear(startYear: number): string {
  const end = (startYear + 1) % 100;
  return `${startYear}/${String(end).padStart(2, "0")}`;
}

// Dropdown options: from 2000 up to the FY after the current one, newest first.
// Covers legacy back-dated contracts on the low end and next-FY renewals on
// the high end without needing a user-configurable range.
export function financialYearOptions(currentYear = new Date().getFullYear()): number[] {
  const maxStart = currentYear + 1;
  const minStart = 2000;
  const out: number[] = [];
  for (let y = maxStart; y >= minStart; y--) out.push(y);
  return out;
}
