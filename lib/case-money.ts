// BR-M1-01 / BR-M1-02 — money helpers used by every value-bearing screen and
// report. Payment sums exclude reversed payments (BR-M1-09).

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { casePayments } from "@/db/schema";

export function totalClaimed(
  contribution: string | number | null | undefined,
  surcharge: string | number | null | undefined,
): number {
  const c = Number(contribution ?? 0) || 0;
  const s = Number(surcharge ?? 0) || 0;
  return c + s;
}

export async function paidToDate(caseId: string, asOf?: Date): Promise<number> {
  const asOfIso = asOf ? asOf.toISOString().slice(0, 10) : null;
  const rows = await db
    .select({
      paid: sql<string>`COALESCE(SUM(${casePayments.amountContribution} + ${casePayments.amountSurcharge}), 0)`,
    })
    .from(casePayments)
    .where(
      and(
        eq(casePayments.caseReferralId, caseId),
        eq(casePayments.isReversed, false),
        ...(asOfIso ? [sql`${casePayments.paymentDate} <= ${asOfIso}`] : []),
      ),
    );
  return Number(rows[0]?.paid ?? 0);
}

export function outstanding(claimed: number, paid: number): number {
  return Math.max(claimed - paid, 0);
}
