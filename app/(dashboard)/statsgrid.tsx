import { db } from "@/db";
import { caseReferrals, caseReferralTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, count, notInArray, and, sum } from "drizzle-orm";
import { StatsGridClient } from "./statsgrid-client";

const TERMINAL: ("closed" | "withdrawn" | "not_filed")[] = [
  "closed",
  "withdrawn",
  "not_filed",
];

export default async function StatsGrid() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id;

  const [
    overviewTypeCounts,
    overviewClaimResult,
    overviewCasesResult,
    personalTypeCounts,
    personalClaimResult,
    personalCasesResult,
  ] = await Promise.all([
    db.select({ caseType: caseReferralTypes.caseType, total: count() })
      .from(caseReferralTypes)
      .groupBy(caseReferralTypes.caseType),

    db.select({ total: sum(caseReferrals.totalClaimed) })
      .from(caseReferrals)
      .where(notInArray(caseReferrals.status, TERMINAL)),

    db.select({ total: count() })
      .from(caseReferrals)
      .where(notInArray(caseReferrals.status, TERMINAL)),

    userId
      ? db.select({ caseType: caseReferralTypes.caseType, total: count() })
          .from(caseReferralTypes)
          .innerJoin(caseReferrals, eq(caseReferralTypes.caseReferralId, caseReferrals.id))
          .where(eq(caseReferrals.assignedOfficerId, userId))
          .groupBy(caseReferralTypes.caseType)
      : Promise.resolve([]),

    userId
      ? db.select({ total: sum(caseReferrals.totalClaimed) })
          .from(caseReferrals)
          .where(
            and(
              eq(caseReferrals.assignedOfficerId, userId),
              notInArray(caseReferrals.status, TERMINAL),
            ),
          )
      : Promise.resolve([{ total: "0" }]),

    userId
      ? db.select({ total: count() })
          .from(caseReferrals)
          .where(eq(caseReferrals.assignedOfficerId, userId))
      : Promise.resolve([{ total: 0 }]),
  ]);

  const overview = {
    byType: Object.fromEntries(overviewTypeCounts.map((r) => [r.caseType, r.total])),
    claim: parseFloat(overviewClaimResult[0]?.total ?? "0"),
    cases: overviewCasesResult[0]?.total ?? 0,
  };

  const personal = {
    byType: Object.fromEntries(personalTypeCounts.map((r) => [r.caseType, r.total])),
    claim: parseFloat(personalClaimResult[0]?.total ?? "0"),
    cases: personalCasesResult[0]?.total ?? 0,
  };

  return <StatsGridClient personal={personal} overview={overview} />;
}
