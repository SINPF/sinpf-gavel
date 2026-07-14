import {
  IconReceiptTax,
  IconCoin,
  IconCash,
  IconUser,
  IconArrowRight,
  IconSum,
  IconCalendarPlus,
  IconCircleDot,
} from "@tabler/icons-react";
import Link from "next/link";
import { db } from "@/db";
import { caseReferrals, caseReferralTypes, caseActivities, employers, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, count, ne, gte, lt, desc, and, sum } from "drizzle-orm";
import type { ReactNode } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSBD(value: number): string {
  return "SBD " + value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTimestamp(date: Date): string {
  // dd/mm/yyyy per §6 content rules
  return (
    date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function buildActivityLabel(type: string, notes: string | null, employer: string): string {
  const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  switch (type) {
    case "stage_changed": {
      const stage = notes?.replace(/^stage changed to /i, "").trim() ?? "";
      return `Moved to ${titleCase(stage)} · ${employer}`;
    }
    case "case_closed": {
      const reason = notes?.split(/—|-/)[1]?.trim() ?? "";
      return reason
        ? `Case closed (${titleCase(reason)}) · ${employer}`
        : `Case closed · ${employer}`;
    }
    case "assessment_completed":   return `Assessment completed · ${employer}`;
    case "demand_letter_issued":   return `Demand letter issued to ${employer}`;
    case "negotiation_entered":    return `Negotiation entered with ${employer}`;
    case "negotiation_completed":  return `Negotiation completed with ${employer}`;
    case "prosecution_filed":      return `Prosecution filed against ${employer}`;
    case "hearing_scheduled":      return `Hearing scheduled · ${employer}`;
    case "consent_order_entered":  return `Consent order entered · ${employer}`;
    case "default_judgment_filed": return `Default judgment filed · ${employer}`;
    case "enforcement_filed":      return `Enforcement action filed · ${employer}`;
    case "case_discontinued":      return `Case discontinued · ${employer}`;
    case "note_added":             return `Note added · ${employer}`;
    case "document_added":         return `Document added · ${employer}`;
    default:                       return notes ?? type.replace(/_/g, " ");
  }
}

// Stage dot colors track Badge status families in components/ui/Badge.tsx
const STAGE_CONFIG = [
  { status: "registered",    label: "Registered",     dot: "bg-primary" },
  { status: "assessment",    label: "Assessment",     dot: "bg-primary" },
  { status: "demand_issued", label: "Demand issued",  dot: "bg-highlight" },
  { status: "negotiation",   label: "Negotiation",    dot: "bg-highlight" },
  { status: "prosecution",   label: "Prosecution",    dot: "bg-destructive" },
  { status: "in_progress",   label: "In progress",    dot: "bg-highlight" },
  { status: "resolved",      label: "Resolved",       dot: "bg-success" },
];

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
      className="group block rounded-md overflow-hidden bg-sinpf-navy text-white border border-blue-800 transition-colors hover:border-highlight/40"
    >
      <div className="relative p-6 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/60 mb-2">{description}</p>
          <p className="text-3xl font-bold text-white tracking-tight tabular-nums leading-none mb-3 truncate">{value}</p>
          <p className="font-serif text-lg font-semibold text-white/95">{label}</p>
        </div>
        <div className="flex flex-col items-end gap-4 shrink-0">
          <div className="p-3 rounded-md bg-blue-800/60 text-white/85 border border-blue-800">{icon}</div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/60 group-hover:text-highlight transition-colors">
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

function StagePipeline({ byStage }: { byStage: Record<string, number> }) {
  const total = STAGE_CONFIG.reduce((s, c) => s + (byStage[c.status] ?? 0), 0);
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Matters by stage</h3>
      </div>
      <div className="grid grid-cols-4 lg:grid-cols-7">
        {STAGE_CONFIG.map((s, i) => {
          const n   = byStage[s.status] ?? 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <Link
              key={s.status}
              href={`/cases?status=${s.status}`}
              className={`group flex flex-col items-center gap-2 py-5 px-3 hover:bg-blue-50 transition-colors text-center ${
                i < STAGE_CONFIG.length - 1 ? "border-r border-border" : ""
              }`}
            >
              <span className="text-3xl font-bold tabular-nums text-foreground leading-none">{n}</span>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] leading-tight">{s.label}</span>
              <span className="text-[11px] text-muted-foreground/70 tabular-nums">{pct}%</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed({
  activities,
}: {
  activities: { id: string; caseId: string; activityType: string; notes: string | null; createdAt: Date; performerName: string | null; performerEmail: string | null; employerName: string | null }[];
}) {
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Recent activity</h3>
        <Link href="/cases" className="text-xs font-medium text-primary hover:underline">View all matters</Link>
      </div>
      {activities.length === 0 ? (
        <p className="px-5 py-10 text-sm text-center text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {activities.map((a) => (
            <Link
              key={a.id}
              href={`/cases/${a.caseId}`}
              className="flex items-start gap-3 px-5 py-4 hover:bg-blue-50 transition-colors group"
            >
              <IconCircleDot className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {buildActivityLabel(a.activityType, a.notes, a.employerName ?? "Unknown employer")}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Matter no. {a.caseId.slice(0, 8).toUpperCase()}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconUser className="w-3 h-3 shrink-0" />
                    {a.performerName || a.performerEmail || <span className="italic">Unknown</span>}
                  </span>
                  <span className="text-xs text-muted-foreground/70 tabular-nums">
                    {formatTimestamp(a.createdAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
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
    stageCounts,
    claimResult,
    recentActivities,
    thisMonthResult,
    lastMonthResult,
  ] = await Promise.all([
    db.select({ caseType: caseReferralTypes.caseType, total: count() })
      .from(caseReferralTypes)
      .groupBy(caseReferralTypes.caseType),

    userId
      ? db.select({ total: count() }).from(caseReferrals).where(eq(caseReferrals.assignedTo, userId))
      : Promise.resolve([{ total: 0 }]),

    db.select({ status: caseReferrals.status, total: count() })
      .from(caseReferrals)
      .where(ne(caseReferrals.status, "closed"))
      .groupBy(caseReferrals.status),

    db.select({ total: sum(caseReferrals.grandTotalClaim) })
      .from(caseReferrals)
      .where(ne(caseReferrals.status, "closed")),

    db.select({
        id:             caseActivities.id,
        caseId:         caseActivities.caseReferralId,
        activityType:   caseActivities.activityType,
        notes:          caseActivities.notes,
        createdAt:      caseActivities.createdAt,
        performerName:  user.name,
        performerEmail: user.email,
        employerName:   employers.name,
      })
      .from(caseActivities)
      .leftJoin(user,          eq(caseActivities.performedBy,        user.id))
      .leftJoin(caseReferrals, eq(caseActivities.caseReferralId,     caseReferrals.id))
      .leftJoin(employers,     eq(caseReferrals.employerId,          employers.id))
      .orderBy(desc(caseActivities.createdAt))
      .limit(8),

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
  const byStage       = Object.fromEntries(stageCounts.map((r) => [r.status, r.total]));
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

      {/* Stage pipeline */}
      <StagePipeline byStage={byStage} />

      {/* Activity feed */}
      <ActivityFeed activities={recentActivities} />
    </div>
  );
}
