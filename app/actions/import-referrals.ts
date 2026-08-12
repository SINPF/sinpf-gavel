"use server";

import * as XLSX from "xlsx";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  caseReferralTypes,
  employers,
  referralStatusHistory,
  auditLog,
  caseStatusEnum,
} from "@/db/schema";
import { assertCan } from "@/lib/rbac";
import { nextReferralRef } from "@/lib/referral-ref";
import { totalClaimed } from "@/lib/case-money";
import { refreshIntakeFlag } from "@/lib/intake";
import { CASE_TYPE_VALUES } from "@/db/validator";
import { revalidatePath } from "next/cache";

type CaseType = (typeof CASE_TYPE_VALUES)[number];
type Status = (typeof caseStatusEnum.enumValues)[number];

const CASE_TYPE_ALIASES: Record<string, CaseType> = {
  unpaid_contribution: "unpaid_contribution",
  contribution: "unpaid_contribution",
  contributions: "unpaid_contribution",
  unpaid_surcharge: "unpaid_surcharge",
  surcharge: "unpaid_surcharge",
  surcharges: "unpaid_surcharge",
  wages_record: "wages_record",
  wages: "wages_record",
};

const STATUS_ALIASES: Record<string, Status> = {
  received: "received",
  under_assessment: "under_assessment",
  assessment: "under_assessment",
  notice_served: "notice_served",
  settlement: "settlement",
  negotiation: "settlement",
  court_prep: "court_prep",
  in_court: "in_court",
  paid: "paid",
  wages_received: "wages_received",
  closed: "closed",
  withdrawn: "withdrawn",
  not_filed: "not_filed",
};

export type ImportRowError = {
  rowNumber: number; // 1-based, matching the spreadsheet row (header = 1)
  column: string;
  message: string;
};

export type ImportResult = {
  ok: boolean;
  scanned: number;
  toInsert: number;
  errors: ImportRowError[];
  duplicates: string[]; // legacyRefs that already exist
  imported?: number;
};

// FR-M1-021 — validate and (optionally) commit a bulk import from xlsx.
// All-or-nothing per file: if any row fails validation, nothing commits.
export async function importReferrals(input: {
  fileBase64: string;
  fileName: string;
  validateOnly: boolean;
}): Promise<ImportResult> {
  const user = await assertCan("bulk_import");

  const buf = Buffer.from(input.fileBase64, "base64");
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { ok: false, scanned: 0, toInsert: 0, errors: [{ rowNumber: 1, column: "sheet", message: "No sheet found." }], duplicates: [] };
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const errors: ImportRowError[] = [];

  // Pre-load employer index by code for FK checks.
  const emps = await db.select({ id: employers.id, code: employers.code }).from(employers);
  const empByCode = new Map(emps.map((e) => [e.code.toLowerCase(), e.id]));

  type Parsed = {
    row: number;
    legacyRef: string | null;
    employerId: string;
    referralDate: string;
    dateReceived: string;
    contribution: number | null;
    surcharge: number | null;
    wagesPeriods: string | null;
    periodFrom: string | null;
    periodTo: string | null;
    types: CaseType[];
    status: Status;
  };

  const parsed: Parsed[] = [];

  function s(v: unknown): string | null {
    if (v == null) return null;
    const t = String(v).trim();
    return t.length ? t : null;
  }
  function d(v: unknown): string | null {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const t = String(v).trim();
    if (!t) return null;
    const parsedDate = new Date(t);
    if (isNaN(parsedDate.getTime())) return null;
    return parsedDate.toISOString().slice(0, 10);
  }
  function n(v: unknown): number | null {
    if (v == null || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // xlsx header is row 1
    const legacyRef = s(row.legacyRef ?? row.legacy_ref ?? row["Legacy Ref"] ?? row["legacy ref"]);
    const employerCode = s(row.employerCode ?? row.employer_code ?? row["Employer Code"]);
    const referralDate = d(row.referralDate ?? row.referral_date ?? row["Referral Date"]);
    const dateReceived = d(row.dateReceived ?? row.date_received ?? row["Date Received"]) ?? referralDate;
    const contribution = n(row.contributionAmount ?? row.contribution_amount ?? row.contribution);
    const surcharge = n(row.surchargeAmount ?? row.surcharge_amount ?? row.surcharge);
    const wagesPeriods = s(row.wagesPeriods ?? row.wages_periods);
    const periodFrom = d(row.periodOfDefaultFrom ?? row.period_of_default_from ?? row["Period From"]);
    const periodTo = d(row.periodOfDefaultTo ?? row.period_of_default_to ?? row["Period To"]);
    const typesRaw = s(row.types ?? row.case_types ?? row["Types"]) ?? "";
    const statusRaw = s(row.status ?? row["Status"]) ?? "under_assessment";

    let hadError = false;
    function err(column: string, message: string) {
      errors.push({ rowNumber, column, message });
      hadError = true;
    }

    if (!employerCode) err("employerCode", "Employer code is required.");
    else if (!empByCode.has(employerCode.toLowerCase())) {
      err("employerCode", `Unknown employer code "${employerCode}".`);
    }
    if (!referralDate) err("referralDate", "Referral date is required.");

    const types = typesRaw
      .split(/[,;|]/)
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean)
      .map((t) => CASE_TYPE_ALIASES[t])
      .filter((t): t is CaseType => !!t);
    if (types.length === 0) err("types", "At least one case type is required.");

    const status = STATUS_ALIASES[statusRaw.toLowerCase().replace(/\s+/g, "_")];
    if (!status) err("status", `Unknown status "${statusRaw}".`);

    if (types.includes("unpaid_contribution") && !(contribution && contribution > 0)) {
      err("contributionAmount", "Contribution amount required when unpaid_contribution is selected.");
    }
    if (types.includes("unpaid_surcharge") && !(surcharge && surcharge > 0)) {
      err("surchargeAmount", "Surcharge amount required when unpaid_surcharge is selected.");
    }
    if (types.includes("wages_record") && !wagesPeriods) {
      err("wagesPeriods", "Wage periods required when wages_record is selected.");
    }
    if (periodFrom && periodTo && periodTo < periodFrom) {
      err("periodOfDefaultTo", "Period end cannot be before period start.");
    }

    if (!hadError) {
      parsed.push({
        row: rowNumber,
        legacyRef,
        employerId: empByCode.get(employerCode!.toLowerCase())!,
        referralDate: referralDate!,
        dateReceived: dateReceived!,
        contribution,
        surcharge,
        wagesPeriods,
        periodFrom,
        periodTo,
        types,
        status: status!,
      });
    }
  }

  // FR-M1-021.3 — duplicate detection on legacy ref.
  const legacyRefs = parsed.map((p) => p.legacyRef).filter((v): v is string => !!v);
  const existing = legacyRefs.length
    ? await db
        .select({ legacyRef: caseReferrals.legacyRef })
        .from(caseReferrals)
        .where(inArray(caseReferrals.legacyRef, legacyRefs))
    : [];
  const duplicates = existing.map((r) => r.legacyRef).filter((v): v is string => !!v);
  for (const d of duplicates) {
    const p = parsed.find((x) => x.legacyRef === d)!;
    errors.push({ rowNumber: p.row, column: "legacyRef", message: `Legacy reference "${d}" already imported.` });
  }

  const isDryRun = input.validateOnly || errors.length > 0;
  if (isDryRun) {
    return {
      ok: errors.length === 0,
      scanned: rows.length,
      toInsert: parsed.length - duplicates.length,
      errors,
      duplicates,
    };
  }

  // Commit.
  const now = new Date();
  let imported = 0;
  await db.transaction(async (tx) => {
    for (const p of parsed) {
      const ref = await nextReferralRef(tx as unknown as typeof db, new Date(p.referralDate).getFullYear());
      const total = totalClaimed(p.contribution, p.surcharge);
      const [inserted] = await tx
        .insert(caseReferrals)
        .values({
          referralRef: ref,
          legacyRef: p.legacyRef,
          employerId: p.employerId,
          referralDate: p.referralDate,
          dateReceived: p.dateReceived,
          contributionAmount: p.contribution != null ? String(p.contribution) : null,
          surchargeAmount: p.surcharge != null ? String(p.surcharge) : null,
          totalClaimed: String(total),
          wagesPeriods: p.wagesPeriods,
          periodOfDefaultFrom: p.periodFrom ?? undefined,
          periodOfDefaultTo: p.periodTo ?? undefined,
          status: p.status,
          statusChangedAt: now,
          lastActivityAt: now,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: caseReferrals.id });

      await tx.insert(caseReferralTypes).values(
        p.types.map((t) => ({ caseReferralId: inserted.id, caseType: t })),
      );
      await tx.insert(referralStatusHistory).values({
        caseReferralId: inserted.id,
        fromStatus: null,
        toStatus: p.status,
        reason: "Bulk import",
        changedBy: user.id,
      });
      await tx.insert(auditLog).values({
        entity: "case_referrals",
        entityId: inserted.id,
        action: "import",
        actorId: user.id,
        newValue: JSON.stringify({ legacyRef: p.legacyRef, ref, row: p.row }),
      });
      imported++;
    }
  });

  // Refresh intake flags outside the tx (each does its own writes).
  const insertedRefs = await db
    .select({ id: caseReferrals.id })
    .from(caseReferrals)
    .where(inArray(caseReferrals.legacyRef, legacyRefs.filter((r) => !duplicates.includes(r))));
  for (const r of insertedRefs) await refreshIntakeFlag(r.id);

  revalidatePath("/cases");
  return {
    ok: true,
    scanned: rows.length,
    toInsert: parsed.length,
    errors: [],
    duplicates,
    imported,
  };
}
