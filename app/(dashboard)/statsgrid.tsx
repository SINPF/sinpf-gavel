import { db } from "@/db";
import { caseReferrals, caseReferralTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, count, ne, and, sum } from "drizzle-orm";
import { StatsGridClient } from "./statsgrid-client";

export default async function StatsGrid() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId  = session?.user.id;

  const [
    overviewTypeCounts,
    overviewClaimResult,
    overviewCasesResult,
    personalTypeCounts,
    personalClaimResult,
    personalCasesResult,
  ] = await Promise.all([
    // ─── Overview: system-wide ─────────────────────────────────────────────────
    db.select({ caseType: caseReferralTypes.caseType, total: count() })
      .from(caseReferralTypes)
      .groupBy(caseReferralTypes.caseType),

    db.select({ total: sum(caseReferrals.grandTotalClaim) })
      .from(caseReferrals)
      .where(ne(caseReferrals.status, "closed")),

    db.select({ total: count() })
      .from(caseReferrals)
      .where(ne(caseReferrals.status, "closed")),

    // ─── Personal: filtered by current user ────────────────────────────────────
    userId
      ? db.select({ caseType: caseReferralTypes.caseType, total: count() })
          .from(caseReferralTypes)
          .innerJoin(caseReferrals, eq(caseReferralTypes.caseReferralId, caseReferrals.id))
          .where(eq(caseReferrals.assignedTo, userId))
          .groupBy(caseReferralTypes.caseType)
      : Promise.resolve([]),

    userId
      ? db.select({ total: sum(caseReferrals.grandTotalClaim) })
          .from(caseReferrals)
          .where(and(eq(caseReferrals.assignedTo, userId), ne(caseReferrals.status, "closed")))
      : Promise.resolve([{ total: "0" }]),

    userId
      ? db.select({ total: count() })
          .from(caseReferrals)
          .where(eq(caseReferrals.assignedTo, userId))
      : Promise.resolve([{ total: 0 }]),
  ]);

  const overview = {
    byType:  Object.fromEntries(overviewTypeCounts.map((r) => [r.caseType, r.total])),
    claim:   parseFloat(overviewClaimResult[0]?.total ?? "0"),
    cases: overviewCasesResult[0]?.total ?? 0,
  };

  const personal = {
    byType:  Object.fromEntries(personalTypeCounts.map((r) => [r.caseType, r.total])),
    claim:   parseFloat(personalClaimResult[0]?.total ?? "0"),
    cases: personalCasesResult[0]?.total ?? 0,
  };

  return <StatsGridClient personal={personal} overview={overview} />;
}
