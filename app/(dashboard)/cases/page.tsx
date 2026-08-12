import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  employers,
  user,
  casePayments,
} from "@/db/schema";
import { desc, eq, sql, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import NavBar from "./navbar";
import CasesClient from "./cases-client";

export default async function CasesPage({
  searchParams,
}: {
  searchParams?: Promise<{ mine?: string; type?: string }>;
}) {
  const [session, params] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    searchParams ?? Promise.resolve({} as { mine?: string; type?: string }),
  ]);
  const currentUserId = session?.user.id ?? null;
  const initialMyCases = params.mine === "1";
  const initialCaseType = params.type ?? "";

  const paidSub = db
    .select({
      caseId: casePayments.caseReferralId,
      paid: sql<string>`SUM(${casePayments.amountContribution} + ${casePayments.amountSurcharge})`.as(
        "paid",
      ),
    })
    .from(casePayments)
    .where(eq(casePayments.isReversed, false))
    .groupBy(casePayments.caseReferralId)
    .as("paid_sub");

  const [rows, allTypes, allEmployers] = await Promise.all([
    db
      .select({
        id: caseReferrals.id,
        referralRef: caseReferrals.referralRef,
        employerId: caseReferrals.employerId,
        employerName: employers.name,
        employerCode: employers.code,
        referralDate: caseReferrals.referralDate,
        dateReceived: caseReferrals.dateReceived,
        contributionAmount: caseReferrals.contributionAmount,
        surchargeAmount: caseReferrals.surchargeAmount,
        totalClaimed: caseReferrals.totalClaimed,
        wagesPeriods: caseReferrals.wagesPeriods,
        status: caseReferrals.status,
        assignedOfficerId: caseReferrals.assignedOfficerId,
        assignedAt: caseReferrals.assignedAt,
        lastActivityAt: caseReferrals.lastActivityAt,
        nextCourtDate: caseReferrals.nextCourtDate,
        responseDueDate: caseReferrals.responseDueDate,
        isIntakeComplete: caseReferrals.isIntakeComplete,
        riskFlags: caseReferrals.riskFlags,
        createdAt: caseReferrals.createdAt,
        updatedAt: caseReferrals.updatedAt,
        assigneeName: user.name,
        assigneeEmail: user.email,
        paid: paidSub.paid,
      })
      .from(caseReferrals)
      .innerJoin(employers, eq(caseReferrals.employerId, employers.id))
      .leftJoin(user, eq(caseReferrals.assignedOfficerId, user.id))
      .leftJoin(paidSub, eq(paidSub.caseId, caseReferrals.id))
      .where(and(eq(caseReferrals.isDeleted, false)))
      .orderBy(desc(caseReferrals.referralDate), desc(caseReferrals.createdAt)),

    db.select().from(caseReferralTypes),
    db
      .select({ id: employers.id, name: employers.name, code: employers.code })
      .from(employers)
      .orderBy(employers.name),
  ]);

  const typesByCaseId = allTypes.reduce<Record<string, string[]>>((acc, t) => {
    (acc[t.caseReferralId] ??= []).push(t.caseType);
    return acc;
  }, {});

  const cases = rows.map((r) => {
    const claimed = Number(r.totalClaimed ?? 0);
    const paid = Number(r.paid ?? 0);
    return {
      ...r,
      types: typesByCaseId[r.id] ?? [],
      paidToDate: paid,
      outstanding: Math.max(claimed - paid, 0),
    };
  });

  return (
    <>
      <NavBar />
      <CasesClient
        cases={cases}
        employers={allEmployers}
        currentUserId={currentUserId}
        initialMyCases={initialMyCases}
        initialCaseType={initialCaseType}
      />
    </>
  );
}
