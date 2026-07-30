import {
  IconReceiptTax,
  IconCoin,
  IconCash,
  IconUser,
  IconArrowRight,
  IconSum,
  IconCalendarPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { db } from "@/db";
import { caseReferrals, caseReferralTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, count, ne, gte, lt, and, sum } from "drizzle-orm";
import type { ReactNode } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSBD(value: number): string {
  return "SBD " + value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Card components ──────────────────────────────────────────────────────────

// Primary cards — navy institutional slabs. Gold is used only as the subtle bottom sweep
// per §4 "gold is present in the navy signature element" — used sparingly.
function PrimaryCard({
  label,
  value,
  description,
  icon,
  href,
  linkLabel = "View matters",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  href: string;
  linkLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-md overflow-hidden bg-blue-50 border border-blue-200 transition-colors hover:border-primary/40"
    >
      <div className="relative p-6 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">{description}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums leading-none mb-3 truncate">{value}</p>
          <p className="font-serif text-lg font-semibold text-foreground">{label}</p>
        </div>
        <div className="flex flex-col items-end gap-4 shrink-0">
          <div className="p-3 rounded-md bg-primary/10 text-primary border border-primary/20">{icon}</div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
            {linkLabel} <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryCard({
  label,
  value,
  description,
  icon,
  href,
  accent,
  badge,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  href: string;
  accent: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block bg-card border border-border rounded-md overflow-hidden transition-colors hover:border-primary/40"
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-md bg-muted">
            <span className="text-muted-foreground">{icon}</span>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            <IconArrowRight className="w-4 h-4 text-border group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums leading-none">{value}</p>
        <p className="text-sm font-medium text-foreground mt-1.5">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-[0.06em] font-semibold">{description}</p>
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default async function StatsGrid() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId  = session?.user.id;

  const now           = new Date();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    typeCounts,
    assignedResult,
    claimResult,
    thisMonthResult,
    lastMonthResult,
  ] = await Promise.all([
    db.select({ caseType: caseReferralTypes.caseType, total: count() })
      .from(caseReferralTypes)
      .groupBy(caseReferralTypes.caseType),

    userId
      ? db.select({ total: count() }).from(caseReferrals).where(eq(caseReferrals.assignedTo, userId))
      : Promise.resolve([{ total: 0 }]),

    db.select({ total: sum(caseReferrals.grandTotalClaim) })
      .from(caseReferrals)
      .where(ne(caseReferrals.status, "closed")),

    db.select({ total: count() })
      .from(caseReferrals)
      .where(gte(caseReferrals.createdAt, monthStart)),

    db.select({ total: count() })
      .from(caseReferrals)
      .where(and(
        gte(caseReferrals.createdAt, lastMonthStart),
        lt(caseReferrals.createdAt, monthStart),
      )),
  ]);

  const byType        = Object.fromEntries(typeCounts.map((r) => [r.caseType, r.total]));
  const assignedCount = assignedResult[0]?.total ?? 0;
  const totalClaim    = parseFloat(claimResult[0]?.total ?? "0");
  const thisMonth     = thisMonthResult[0]?.total ?? 0;
  const lastMonth     = lastMonthResult[0]?.total ?? 0;
  const monthDiff     = thisMonth - lastMonth;

  const monthBadge = monthDiff !== 0 ? (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm tabular-nums ${
      monthDiff > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    }`}>
      {monthDiff > 0 ? "+" : ""}{monthDiff} vs last month
    </span>
  ) : null;

  return (
    <div className="space-y-5">
      {/* Primary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PrimaryCard
          label="Assigned to me"
          value={String(assignedCount)}
          description="matters assigned to you"
          icon={<IconUser className="w-6 h-6" />}
          href="/cases?mine=1"
        />
        <PrimaryCard
          label="Total outstanding claim"
          value={formatSBD(totalClaim)}
          description="active matters · combined value"
          icon={<IconSum className="w-6 h-6" />}
          href="/cases"
          linkLabel="View matters"
        />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <SecondaryCard
          label="Contributions"
          value={String(byType["unpaid_contributions"] ?? 0)}
          description="matters"
          icon={<IconReceiptTax className="w-5 h-5" />}
          href="/cases?type=unpaid_contributions"
          accent="bg-primary"
        />
        <SecondaryCard
          label="Surcharges"
          value={String(byType["unpaid_surcharges"] ?? 0)}
          description="matters"
          icon={<IconCoin className="w-5 h-5" />}
          href="/cases?type=unpaid_surcharges"
          accent="bg-blue-400"
        />
        <SecondaryCard
          label="Wages record"
          value={String(byType["wages_record"] ?? 0)}
          description="matters"
          icon={<IconCash className="w-5 h-5" />}
          href="/cases?type=wages_record"
          accent="bg-highlight"
        />
        <SecondaryCard
          label="New this month"
          value={String(thisMonth)}
          description="matters opened"
          icon={<IconCalendarPlus className="w-5 h-5" />}
          href="/cases"
          accent="bg-success"
          badge={monthBadge}
        />
      </div>
    </div>
  );
}
