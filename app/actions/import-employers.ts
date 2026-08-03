"use server";

import { db } from "@/db";
import { employers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { inArray, or } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export type EmployerImportRow = {
  name:    string;
  code:    string;
  phone?:  string;
  email?:  string;
  address?: string;
};

export type EmployerImportResult = {
  inserted: number;
  skipped:  { row: EmployerImportRow; reason: string }[];
};

export async function importEmployers(rows: EmployerImportRow[]): Promise<EmployerImportResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) throw new Error("Not authenticated");

  const skipped: EmployerImportResult["skipped"] = [];

  // Normalise + validate required fields, and dedupe within the payload.
  const seenNames = new Set<string>();
  const seenCodes = new Set<string>();
  const candidates: EmployerImportRow[] = [];

  for (const raw of rows) {
    const name = (raw.name    ?? "").trim();
    const code = (raw.code    ?? "").trim();
    const phone   = (raw.phone   ?? "").trim();
    const email   = (raw.email   ?? "").trim();
    const address = (raw.address ?? "").trim();

    if (!name || !code) {
      skipped.push({ row: raw, reason: "Missing required name or code" });
      continue;
    }
    if (code.length > 6) {
      skipped.push({ row: raw, reason: "Code exceeds 6 characters" });
      continue;
    }

    const nameKey = name.toLowerCase();
    const codeKey = code.toLowerCase();
    if (seenNames.has(nameKey) || seenCodes.has(codeKey)) {
      skipped.push({ row: raw, reason: "Duplicate within file" });
      continue;
    }
    seenNames.add(nameKey);
    seenCodes.add(codeKey);

    candidates.push({ name, code, phone, email, address });
  }

  if (candidates.length === 0) {
    return { inserted: 0, skipped };
  }

  // Look up existing name/code collisions in one query.
  const existing = await db
    .select({ name: employers.name, code: employers.code })
    .from(employers)
    .where(
      or(
        inArray(employers.name, candidates.map((c) => c.name)),
        inArray(employers.code, candidates.map((c) => c.code)),
      ),
    );

  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
  const existingCodes = new Set(existing.map((e) => e.code.toLowerCase()));

  const toInsert = candidates.filter((c) => {
    if (existingNames.has(c.name.toLowerCase())) {
      skipped.push({ row: c, reason: "Name already exists" });
      return false;
    }
    if (existingCodes.has(c.code.toLowerCase())) {
      skipped.push({ row: c, reason: "Code already exists" });
      return false;
    }
    return true;
  });

  let inserted = 0;
  if (toInsert.length > 0) {
    const rowsInserted = await db
      .insert(employers)
      .values(
        toInsert.map((c) => ({
          name:    c.name,
          code:    c.code,
          phone:   c.phone   || null,
          email:   c.email   || null,
          address: c.address || null,
        })),
      )
      .returning({ id: employers.id });
    inserted = rowsInserted.length;
  }

  revalidatePath("/employers");
  return { inserted, skipped };
}
