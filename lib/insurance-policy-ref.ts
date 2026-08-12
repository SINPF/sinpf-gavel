import { sql } from "drizzle-orm";
import type { db as Db } from "@/db";

// Policies use LSD-INS-YYYY-NNNN, per-year sequence — same UPSERT trick
// as the contract and referral allocators so we lean on Postgres atomicity.
export async function nextInsurancePolicyRef(
  txDb: typeof Db,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const result = await txDb.execute<{ allocated: number }>(sql`
    INSERT INTO insurance_policy_ref_sequence (year, next_number)
    VALUES (${year}, 2)
    ON CONFLICT (year) DO UPDATE
      SET next_number = insurance_policy_ref_sequence.next_number + 1
    RETURNING next_number - 1 AS allocated
  `);
  const rows =
    (result as unknown as { rows?: { allocated: number }[] }).rows ??
    (result as unknown as { allocated: number }[]);
  const allocated = Number(rows[0]?.allocated);
  if (!Number.isFinite(allocated) || allocated < 1) {
    throw new Error("Failed to allocate insurance policy reference");
  }
  return `LSD-INS-${year}-${String(allocated).padStart(4, "0")}`;
}
