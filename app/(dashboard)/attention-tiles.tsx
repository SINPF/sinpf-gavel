import Link from "next/link";
import { and, eq, sql, count, inArray, isNotNull, lte, gte, or, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { caseReferrals, contracts, insurancePolicies } from "@/db/schema";
import {
  AlertTriangle,
  Gavel,
  Clock,
  ClipboardList,
  Inbox,
  FileWarning,
  ShieldAlert,
} from "lucide-react";
import { currentUser } from "@/lib/rbac";

const OPEN_STATUSES = [
  "received",
  "under_assessment",
  "notice_served",
  "settlement",
  "court_prep",
  "in_court",
  "paid",
  "wages_received",
] as const;

const INACTIVITY_DAYS = 30;

async function counts(userId: string | null, isMls: boolean) {
  const today = new Date().toISOString().slice(0, 10);
  const inactivityCutoff = new Date(
    Date.now() - INACTIVITY_DAYS * 86_400_000,
  ).toISOString();
  const courtWindow = new Date(Date.now() + 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const mineFilter = isMls
    ? undefined
    : userId
    ? eq(caseReferrals.assignedOfficerId, userId)
    : sql`false`;
  const baseFilters = and(
    eq(caseReferrals.isDeleted, false),
    inArray(
      caseReferrals.status,
      OPEN_STATUSES as unknown as (typeof caseReferrals.status.enumValues),
    ),
    ...(mineFilter ? [mineFilter] : []),
  );

  const [overdue] = await db
    .select({ n: count() })
    .from(caseReferrals)
    .where(
      and(
        baseFilters,
        isNotNull(caseReferrals.responseDueDate),
        lte(caseReferrals.responseDueDate, today),
      ),
    );

  const [courtSoon] = await db
    .select({ n: count() })
    .from(caseReferrals)
    .where(
      and(
        baseFilters,
        isNotNull(caseReferrals.nextCourtDate),
        gte(caseReferrals.nextCourtDate, today),
        lte(caseReferrals.nextCourtDate, courtWindow),
      ),
    );

  const [inactive] = await db
    .select({ n: count() })
    .from(caseReferrals)
    .where(and(baseFilters, lte(caseReferrals.lastActivityAt, new Date(inactivityCutoff))));

  const [intakeIncomplete] = await db
    .select({ n: count() })
    .from(caseReferrals)
    .where(and(baseFilters, eq(caseReferrals.isIntakeComplete, false)));

  const [unassigned] = isMls
    ? await db
        .select({ n: count() })
        .from(caseReferrals)
        .where(
          and(
            eq(caseReferrals.isDeleted, false),
            eq(caseReferrals.status, "received"),
            isNull(caseReferrals.assignedOfficerId),
          ),
        )
    : [{ n: 0 }];

  // Contracts expiring in the next 90 days (spec FR-M2-006 lead time).
  // Shown for all roles that can view contracts; MLS attention primarily.
  const contractHorizon = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  const [contractExpiring] = await db
    .select({ n: count() })
    .from(contracts)
    .where(
      and(
        eq(contracts.isDeleted, false),
        isNull(contracts.terminatedDate),
        gte(contracts.endDate, today),
        lte(contracts.endDate, contractHorizon),
      ),
    );

  // Insurance policies expiring in the next 60 days (FR-M3-004 default window).
  const insuranceHorizon = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const [insuranceExpiring] = await db
    .select({ n: count() })
    .from(insurancePolicies)
    .where(
      and(
        eq(insurancePolicies.isDeleted, false),
        gte(insurancePolicies.coverageEnd, today),
        lte(insurancePolicies.coverageEnd, insuranceHorizon),
      ),
    );

  return {
    overdue: overdue.n,
    courtSoon: courtSoon.n,
    inactive: inactive.n,
    intakeIncomplete: intakeIncomplete.n,
    unassigned: unassigned.n,
    contractsExpiring: contractExpiring.n,
    insuranceExpiring: insuranceExpiring.n,
  };
}

// FR-M1-015 — 4 attention tiles for officers, + unassigned queue for MLS.
export default async function AttentionTiles() {
  const me = await currentUser();
  const isMls = me?.role === "mls" || me?.role === "system_admin";
  const c = await counts(me?.id ?? null, !!isMls);

  const tiles = [
    {
      label: "Overdue response",
      value: c.overdue,
      href: "/cases",
      icon: <AlertTriangle className="w-4 h-4" />,
      tone: "text-destructive",
    },
    {
      label: "Court date within 14 days",
      value: c.courtSoon,
      href: "/cases",
      icon: <Gavel className="w-4 h-4" />,
      tone: "text-warning",
    },
    {
      label: `Inactive > ${INACTIVITY_DAYS} days`,
      value: c.inactive,
      href: "/cases",
      icon: <Clock className="w-4 h-4" />,
      tone: "text-muted-foreground",
    },
    {
      label: "Intake incomplete",
      value: c.intakeIncomplete,
      href: "/cases",
      icon: <ClipboardList className="w-4 h-4" />,
      tone: "text-warning",
    },
    {
      label: "Contracts expiring ≤ 90d",
      value: c.contractsExpiring,
      href: "/contracts",
      icon: <FileWarning className="w-4 h-4" />,
      tone: "text-warning",
    },
    {
      label: "Policies expiring ≤ 60d",
      value: c.insuranceExpiring,
      href: "/insurance",
      icon: <ShieldAlert className="w-4 h-4" />,
      tone: "text-warning",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="rounded-md border border-border bg-card p-4 hover:border-primary/40 transition-colors"
        >
          <div className={`flex items-center gap-2 ${t.tone}`}>
            {t.icon}
            <span className="text-2xl font-bold text-foreground tabular-nums">{t.value}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">{t.label}</p>
        </Link>
      ))}
      {isMls && (
        <Link
          href="/cases"
          className="rounded-md border border-primary/30 bg-blue-50 p-4 hover:border-primary transition-colors md:col-span-6"
        >
          <div className="flex items-center gap-2 text-primary">
            <Inbox className="w-4 h-4" />
            <span className="text-2xl font-bold text-foreground tabular-nums">{c.unassigned}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">Unassigned intake queue</p>
        </Link>
      )}
    </div>
  );
}
