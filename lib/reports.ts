// Six reports per spec §14. Every report names one governing date and
// point-in-time evaluates values as at period_end (BR-M1-11).

import { and, eq, sql, inArray, gte, lte, isNotNull, notInArray, count } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  casePayments,
  user,
} from "@/db/schema";

export type Period = { start: string; end: string };

const TERMINAL = ["closed", "withdrawn", "not_filed"] as const;

// ─── Shared: per-referral paid-to-date as at a point in time ────────────

async function paidAsOf(caseId: string, asOfEnd: string) {
  const rows = await db
    .select({
      paid: sql<string>`COALESCE(SUM(${casePayments.amountContribution} + ${casePayments.amountSurcharge}), 0)`,
    })
    .from(casePayments)
    .where(
      and(
        eq(casePayments.caseReferralId, caseId),
        eq(casePayments.isReversed, false),
        lte(casePayments.paymentDate, asOfEnd),
      ),
    );
  return Number(rows[0]?.paid ?? 0);
}

// ─── RPT-M1-01 Referrals Received ────────────────────────────────────────

export type Rpt01Row = {
  month: string; // YYYY-MM
  referrals: number;
  contribution_cases: number;
  surcharge_cases: number;
  wages_cases: number;
  total_claimed: number;
  average_claimed: number;
};

export async function rpt01(period: Period): Promise<Rpt01Row[]> {
  const rows = await db
    .select({
      id: caseReferrals.id,
      referralDate: caseReferrals.referralDate,
      totalClaimed: caseReferrals.totalClaimed,
    })
    .from(caseReferrals)
    .where(
      and(
        eq(caseReferrals.isDeleted, false),
        gte(caseReferrals.referralDate, period.start),
        lte(caseReferrals.referralDate, period.end),
      ),
    );

  const types = rows.length
    ? await db
        .select({ caseReferralId: caseReferralTypes.caseReferralId, caseType: caseReferralTypes.caseType })
        .from(caseReferralTypes)
        .where(inArray(caseReferralTypes.caseReferralId, rows.map((r) => r.id)))
    : [];
  const typesById = new Map<string, string[]>();
  for (const t of types) {
    (typesById.get(t.caseReferralId) ?? typesById.set(t.caseReferralId, []).get(t.caseReferralId))!.push(t.caseType);
  }

  const buckets: Map<string, Rpt01Row> = new Map();
  for (const r of rows) {
    const month = r.referralDate.slice(0, 7);
    const row = buckets.get(month) ?? {
      month,
      referrals: 0,
      contribution_cases: 0,
      surcharge_cases: 0,
      wages_cases: 0,
      total_claimed: 0,
      average_claimed: 0,
    };
    row.referrals += 1;
    row.total_claimed += Number(r.totalClaimed ?? 0);
    const ts = typesById.get(r.id) ?? [];
    if (ts.includes("unpaid_contribution")) row.contribution_cases += 1;
    if (ts.includes("unpaid_surcharge")) row.surcharge_cases += 1;
    if (ts.includes("wages_record")) row.wages_cases += 1;
    buckets.set(month, row);
  }
  const out = Array.from(buckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({ ...r, average_claimed: r.referrals ? r.total_claimed / r.referrals : 0 }));
  return out;
}

// ─── RPT-M1-02 Outstanding by Referral ───────────────────────────────────

export type Rpt02Row = {
  referralRef: string;
  employerName: string;
  employerCode: string;
  caseTypes: string[];
  status: string;
  assignee: string | null;
  claimed: number;
  paidToDate: number;
  outstanding: number;
  daysSinceReferral: number;
  riskFlags: string[];
};

export async function rpt02(period: Period): Promise<Rpt02Row[]> {
  const rows = await db
    .select({
      id: caseReferrals.id,
      referralRef: caseReferrals.referralRef,
      referralDate: caseReferrals.referralDate,
      totalClaimed: caseReferrals.totalClaimed,
      status: caseReferrals.status,
      riskFlags: caseReferrals.riskFlags,
      employerName: sql<string>`emp.name`.as("employerName"),
      employerCode: sql<string>`emp.code`.as("employerCode"),
      assignee: user.name,
    })
    .from(caseReferrals)
    .innerJoin(sql`employers emp`, sql`emp.id = ${caseReferrals.employerId}`)
    .leftJoin(user, eq(user.id, caseReferrals.assignedOfficerId))
    .where(
      and(
        eq(caseReferrals.isDeleted, false),
        gte(caseReferrals.referralDate, period.start),
        lte(caseReferrals.referralDate, period.end),
      ),
    );

  const types = rows.length
    ? await db
        .select({ caseReferralId: caseReferralTypes.caseReferralId, caseType: caseReferralTypes.caseType })
        .from(caseReferralTypes)
        .where(inArray(caseReferralTypes.caseReferralId, rows.map((r) => r.id)))
    : [];
  const typesById = new Map<string, string[]>();
  for (const t of types) {
    (typesById.get(t.caseReferralId) ?? typesById.set(t.caseReferralId, []).get(t.caseReferralId))!.push(t.caseType);
  }

  const out: Rpt02Row[] = [];
  const asOf = period.end;
  for (const r of rows) {
    const paid = await paidAsOf(r.id, asOf);
    const claimed = Number(r.totalClaimed ?? 0);
    out.push({
      referralRef: r.referralRef,
      employerName: r.employerName,
      employerCode: r.employerCode,
      caseTypes: typesById.get(r.id) ?? [],
      status: r.status,
      assignee: r.assignee ?? null,
      claimed,
      paidToDate: paid,
      outstanding: Math.max(claimed - paid, 0),
      daysSinceReferral: Math.max(
        0,
        Math.floor((new Date(asOf).getTime() - new Date(r.referralDate).getTime()) / 86_400_000),
      ),
      riskFlags: (r.riskFlags as string[]) ?? [],
    });
  }
  out.sort((a, b) => b.outstanding - a.outstanding);
  return out;
}

// ─── RPT-M1-03 Per Legal Officer ─────────────────────────────────────────

export type Rpt03Row = {
  officer: string;
  received: number;
  openAtEnd: number;
  closedInPeriod: number;
  totalClaimedHeld: number;
  totalRecoveredInPeriod: number;
  avgDaysToClosure: number;
  inactiveBeyondThreshold: number;
};

export async function rpt03(period: Period): Promise<Rpt03Row[]> {
  const rows = await db
    .select({
      id: caseReferrals.id,
      referralDate: caseReferrals.referralDate,
      closedAt: caseReferrals.closedAt,
      status: caseReferrals.status,
      totalClaimed: caseReferrals.totalClaimed,
      lastActivityAt: caseReferrals.lastActivityAt,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      officerName: user.name,
    })
    .from(caseReferrals)
    .leftJoin(user, eq(user.id, caseReferrals.assignedOfficerId))
    .where(eq(caseReferrals.isDeleted, false));

  const payRows = await db
    .select({
      caseReferralId: casePayments.caseReferralId,
      paymentDate: casePayments.paymentDate,
      total: sql<string>`(${casePayments.amountContribution} + ${casePayments.amountSurcharge})`.as("total"),
    })
    .from(casePayments)
    .where(
      and(
        eq(casePayments.isReversed, false),
        gte(casePayments.paymentDate, period.start),
        lte(casePayments.paymentDate, period.end),
      ),
    );
  const paidByCase = new Map<string, number>();
  for (const p of payRows) {
    paidByCase.set(p.caseReferralId, (paidByCase.get(p.caseReferralId) ?? 0) + Number(p.total));
  }

  const buckets = new Map<string, Rpt03Row>();
  const inactivityCutoff = new Date(Date.now() - 30 * 86_400_000);
  for (const r of rows) {
    const key = r.officerName ?? "Unassigned";
    const b = buckets.get(key) ?? {
      officer: key,
      received: 0,
      openAtEnd: 0,
      closedInPeriod: 0,
      totalClaimedHeld: 0,
      totalRecoveredInPeriod: 0,
      avgDaysToClosure: 0,
      inactiveBeyondThreshold: 0,
    };
    if (r.referralDate >= period.start && r.referralDate <= period.end) b.received += 1;
    const isOpen = !(TERMINAL as readonly string[]).includes(r.status);
    if (isOpen) {
      b.openAtEnd += 1;
      b.totalClaimedHeld += Number(r.totalClaimed ?? 0);
      const lastActivity = r.lastActivityAt instanceof Date ? r.lastActivityAt : new Date(r.lastActivityAt);
      if (lastActivity < inactivityCutoff) b.inactiveBeyondThreshold += 1;
    }
    if (r.closedAt && r.closedAt >= period.start && r.closedAt <= period.end) {
      b.closedInPeriod += 1;
      const closureDays = Math.floor(
        (new Date(r.closedAt).getTime() - new Date(r.referralDate).getTime()) / 86_400_000,
      );
      // Rolling average via count-in-b hack. We accumulate then divide at end.
      // Store sum in avgDaysToClosure and divide after the loop.
      (b as unknown as { _sumDays?: number })._sumDays =
        ((b as unknown as { _sumDays?: number })._sumDays ?? 0) + closureDays;
    }
    b.totalRecoveredInPeriod += paidByCase.get(r.id) ?? 0;
    buckets.set(key, b);
  }
  const out = Array.from(buckets.values());
  for (const b of out) {
    const sum = (b as unknown as { _sumDays?: number })._sumDays ?? 0;
    b.avgDaysToClosure = b.closedInPeriod ? sum / b.closedInPeriod : 0;
    delete (b as unknown as { _sumDays?: number })._sumDays;
  }
  out.sort((a, b) => b.openAtEnd - a.openAtEnd);
  return out;
}

// ─── RPT-M1-04 Case Outcomes ─────────────────────────────────────────────

export type Rpt04Row = {
  outcome: string;
  casesClosed: number;
  totalClaimed: number;
  totalRecovered: number;
  recoveryRate: number;
  avgDaysToClosure: number;
};

export async function rpt04(period: Period): Promise<Rpt04Row[]> {
  const rows = await db
    .select({
      id: caseReferrals.id,
      outcome: caseReferrals.outcome,
      referralDate: caseReferrals.referralDate,
      closedAt: caseReferrals.closedAt,
      totalClaimed: caseReferrals.totalClaimed,
    })
    .from(caseReferrals)
    .where(
      and(
        eq(caseReferrals.isDeleted, false),
        isNotNull(caseReferrals.closedAt),
        gte(caseReferrals.closedAt, period.start),
        lte(caseReferrals.closedAt, period.end),
      ),
    );

  const buckets = new Map<string, Rpt04Row & { _sumDays?: number }>();
  for (const r of rows) {
    const key = r.outcome ?? "(none)";
    const b =
      buckets.get(key) ?? {
        outcome: key,
        casesClosed: 0,
        totalClaimed: 0,
        totalRecovered: 0,
        recoveryRate: 0,
        avgDaysToClosure: 0,
      };
    b.casesClosed += 1;
    b.totalClaimed += Number(r.totalClaimed ?? 0);
    const paid = await paidAsOf(r.id, period.end);
    b.totalRecovered += paid;
    if (r.closedAt) {
      const d = Math.floor(
        (new Date(r.closedAt).getTime() - new Date(r.referralDate).getTime()) / 86_400_000,
      );
      b._sumDays = (b._sumDays ?? 0) + d;
    }
    buckets.set(key, b);
  }
  const out: Rpt04Row[] = [];
  for (const b of buckets.values()) {
    b.avgDaysToClosure = b.casesClosed ? (b._sumDays ?? 0) / b.casesClosed : 0;
    b.recoveryRate = b.totalClaimed ? b.totalRecovered / b.totalClaimed : 0;
    delete b._sumDays;
    out.push(b);
  }
  return out.sort((a, b) => b.casesClosed - a.casesClosed);
}

// ─── RPT-M1-05 Total Paid ────────────────────────────────────────────────

export type Rpt05Row = {
  month: string;
  contribution: number;
  surcharge: number;
  total: number;
  payments: number;
  distinctReferrals: number;
};

export async function rpt05(period: Period): Promise<Rpt05Row[]> {
  const rows = await db
    .select({
      caseReferralId: casePayments.caseReferralId,
      paymentDate: casePayments.paymentDate,
      c: casePayments.amountContribution,
      s: casePayments.amountSurcharge,
    })
    .from(casePayments)
    .where(
      and(
        eq(casePayments.isReversed, false),
        gte(casePayments.paymentDate, period.start),
        lte(casePayments.paymentDate, period.end),
      ),
    );

  const buckets = new Map<string, { row: Rpt05Row; refs: Set<string> }>();
  for (const r of rows) {
    const month = r.paymentDate.slice(0, 7);
    const bucket = buckets.get(month) ?? {
      row: {
        month,
        contribution: 0,
        surcharge: 0,
        total: 0,
        payments: 0,
        distinctReferrals: 0,
      },
      refs: new Set<string>(),
    };
    bucket.row.contribution += Number(r.c ?? 0);
    bucket.row.surcharge += Number(r.s ?? 0);
    bucket.row.total += Number(r.c ?? 0) + Number(r.s ?? 0);
    bucket.row.payments += 1;
    bucket.refs.add(r.caseReferralId);
    buckets.set(month, bucket);
  }
  const out = Array.from(buckets.values())
    .sort((a, b) => a.row.month.localeCompare(b.row.month))
    .map((b) => ({ ...b.row, distinctReferrals: b.refs.size }));
  return out;
}

// ─── RPT-M1-06 Total Outstanding (breakdowns) ────────────────────────────

export type Rpt06Row = {
  breakdown: string;
  bucket: string;
  referrals: number;
  claimed: number;
  paidToDate: number;
  outstanding: number;
  shareOfTotal: number;
};

const AGE_BANDS: [string, number, number | null][] = [
  ["0–30", 0, 30],
  ["31–90", 31, 90],
  ["91–180", 91, 180],
  ["181–365", 181, 365],
  ["over 365", 366, null],
];

export async function rpt06(period: Period): Promise<Rpt06Row[]> {
  const rows = await db
    .select({
      id: caseReferrals.id,
      referralDate: caseReferrals.referralDate,
      status: caseReferrals.status,
      totalClaimed: caseReferrals.totalClaimed,
    })
    .from(caseReferrals)
    .where(
      and(
        eq(caseReferrals.isDeleted, false),
        notInArray(caseReferrals.status, TERMINAL as unknown as (typeof caseReferrals.status.enumValues)),
      ),
    );

  const rowsWithMoney: (typeof rows[number] & { paid: number; out: number; ageDays: number })[] = [];
  const asOf = period.end;
  for (const r of rows) {
    const paid = await paidAsOf(r.id, asOf);
    const claimed = Number(r.totalClaimed ?? 0);
    const out = Math.max(claimed - paid, 0);
    const ageDays = Math.max(
      0,
      Math.floor((new Date(asOf).getTime() - new Date(r.referralDate).getTime()) / 86_400_000),
    );
    rowsWithMoney.push({ ...r, paid, out, ageDays });
  }

  const totalOutstanding = rowsWithMoney.reduce((s, r) => s + r.out, 0);

  const byStatus = new Map<string, Rpt06Row>();
  for (const r of rowsWithMoney) {
    const key = r.status;
    const b =
      byStatus.get(key) ??
      { breakdown: "status", bucket: key, referrals: 0, claimed: 0, paidToDate: 0, outstanding: 0, shareOfTotal: 0 };
    b.referrals += 1;
    b.claimed += Number(r.totalClaimed ?? 0);
    b.paidToDate += r.paid;
    b.outstanding += r.out;
    byStatus.set(key, b);
  }
  for (const b of byStatus.values()) {
    b.shareOfTotal = totalOutstanding ? b.outstanding / totalOutstanding : 0;
  }

  const byAge = new Map<string, Rpt06Row>();
  for (const [label, low, high] of AGE_BANDS) {
    byAge.set(label, {
      breakdown: "age",
      bucket: label,
      referrals: 0,
      claimed: 0,
      paidToDate: 0,
      outstanding: 0,
      shareOfTotal: 0,
    });
  }
  for (const r of rowsWithMoney) {
    const band = AGE_BANDS.find(([, lo, hi]) => r.ageDays >= lo && (hi == null || r.ageDays <= hi));
    if (!band) continue;
    const b = byAge.get(band[0])!;
    b.referrals += 1;
    b.claimed += Number(r.totalClaimed ?? 0);
    b.paidToDate += r.paid;
    b.outstanding += r.out;
  }
  for (const b of byAge.values()) {
    b.shareOfTotal = totalOutstanding ? b.outstanding / totalOutstanding : 0;
  }

  return [...byStatus.values(), ...byAge.values()];
}

// ─── Meta ────────────────────────────────────────────────────────────────

export const REPORTS = [
  { id: "rpt01", label: "RPT-M1-01 Referrals Received" },
  { id: "rpt02", label: "RPT-M1-02 Outstanding by Referral" },
  { id: "rpt03", label: "RPT-M1-03 Per Legal Officer" },
  { id: "rpt04", label: "RPT-M1-04 Case Outcomes" },
  { id: "rpt05", label: "RPT-M1-05 Total Paid" },
  { id: "rpt06", label: "RPT-M1-06 Total Outstanding" },
] as const;

export type ReportId = (typeof REPORTS)[number]["id"];

export async function runReport(id: ReportId, period: Period) {
  switch (id) {
    case "rpt01":
      return { columns: RPT01_COLUMNS, rows: await rpt01(period) };
    case "rpt02":
      return { columns: RPT02_COLUMNS, rows: await rpt02(period) };
    case "rpt03":
      return { columns: RPT03_COLUMNS, rows: await rpt03(period) };
    case "rpt04":
      return { columns: RPT04_COLUMNS, rows: await rpt04(period) };
    case "rpt05":
      return { columns: RPT05_COLUMNS, rows: await rpt05(period) };
    case "rpt06":
      return { columns: RPT06_COLUMNS, rows: await rpt06(period) };
  }
}

// Column definitions used by both the on-screen table and the XLSX writer.
export const RPT01_COLUMNS = [
  { key: "month", header: "Month" },
  { key: "referrals", header: "Referrals" },
  { key: "contribution_cases", header: "Contribution" },
  { key: "surcharge_cases", header: "Surcharge" },
  { key: "wages_cases", header: "Wages" },
  { key: "total_claimed", header: "Total claimed", number: true },
  { key: "average_claimed", header: "Avg claimed", number: true },
] as const;

export const RPT02_COLUMNS = [
  { key: "referralRef", header: "Reference" },
  { key: "employerName", header: "Employer" },
  { key: "employerCode", header: "Code" },
  { key: "caseTypes", header: "Types" },
  { key: "status", header: "Status" },
  { key: "assignee", header: "Officer" },
  { key: "claimed", header: "Claimed", number: true },
  { key: "paidToDate", header: "Paid", number: true },
  { key: "outstanding", header: "Outstanding", number: true },
  { key: "daysSinceReferral", header: "Days" },
  { key: "riskFlags", header: "Risk" },
] as const;

export const RPT03_COLUMNS = [
  { key: "officer", header: "Officer" },
  { key: "received", header: "Received" },
  { key: "openAtEnd", header: "Open at end" },
  { key: "closedInPeriod", header: "Closed" },
  { key: "totalClaimedHeld", header: "Claimed held", number: true },
  { key: "totalRecoveredInPeriod", header: "Recovered", number: true },
  { key: "avgDaysToClosure", header: "Avg days to closure", number: true },
  { key: "inactiveBeyondThreshold", header: "Inactive" },
] as const;

export const RPT04_COLUMNS = [
  { key: "outcome", header: "Outcome" },
  { key: "casesClosed", header: "Cases closed" },
  { key: "totalClaimed", header: "Total claimed", number: true },
  { key: "totalRecovered", header: "Total recovered", number: true },
  { key: "recoveryRate", header: "Recovery rate" },
  { key: "avgDaysToClosure", header: "Avg days to closure", number: true },
] as const;

export const RPT05_COLUMNS = [
  { key: "month", header: "Month" },
  { key: "contribution", header: "Contribution", number: true },
  { key: "surcharge", header: "Surcharge", number: true },
  { key: "total", header: "Total", number: true },
  { key: "payments", header: "Payments" },
  { key: "distinctReferrals", header: "Referrals" },
] as const;

export const RPT06_COLUMNS = [
  { key: "breakdown", header: "Breakdown" },
  { key: "bucket", header: "Bucket" },
  { key: "referrals", header: "Referrals" },
  { key: "claimed", header: "Claimed", number: true },
  { key: "paidToDate", header: "Paid", number: true },
  { key: "outstanding", header: "Outstanding", number: true },
  { key: "shareOfTotal", header: "Share" },
] as const;
