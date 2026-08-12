import { sql } from "drizzle-orm";
import type { db as Db } from "@/db";

// BR-M1-04: allocate LSD-REF-YYYY-NNNN inside the caller's transaction.
// Gaps are permitted; reuse is not. Pass the tx-scoped db handle so the
// sequence lock is held for the caller's create.
//
// UPSERT trick: on first insert we set next_number to 2 and allocate 1;
// on subsequent hits we bump next_number by 1 and allocate the prior value.
export async function nextReferralRef(
  txDb: typeof Db,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const result = await txDb.execute<{ allocated: number }>(sql`
    INSERT INTO referral_ref_sequence (year, next_number)
    VALUES (${year}, 2)
    ON CONFLICT (year) DO UPDATE
      SET next_number = referral_ref_sequence.next_number + 1
    RETURNING next_number - 1 AS allocated
  `);

  const rows = (result as unknown as { rows?: { allocated: number }[] }).rows
    ?? (result as unknown as { allocated: number }[]);
  const allocated = Number(rows[0]?.allocated);
  if (!Number.isFinite(allocated) || allocated < 1) {
    throw new Error("Failed to allocate referral reference");
  }
  return `LSD-REF-${year}-${String(allocated).padStart(4, "0")}`;
}
