// §13 — daily alert evaluation. Idempotent via alerts.dedupe_key +
// alert_job_run.for_date. If the job misses a day, the next run replays
// every day since the last successful run — a missed court-date warning
// is exactly the failure the spec exists to prevent.

import { and, eq, sql, isNull, isNotNull, lte, gte, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  caseReferrals,
  settlementSchedule,
  alerts,
  alertJobRun,
  user,
  userProfile,
} from "@/db/schema";
import { recomputeScheduleStates } from "@/app/actions/settlement-schedule";

const OPEN_STATUSES = [
  "received",
  "under_assessment",
  "notice_served",
  "settlement",
  "court_prep",
  "in_court",
  "paid",
  "wages_received",
] as const;

export type AlertJobResult = {
  runsExecuted: number;
  alertsRaised: number;
  lastForDate: string;
};

// Days offsets we alert at for approaching deadlines. Default configurable.
const DEADLINE_LEADS = [7, 3, 0];
const INACTIVITY_DAYS = 30;
const UNASSIGNED_DAYS = 3;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const A = new Date(a).getTime();
  const B = new Date(b).getTime();
  return Math.round((A - B) / 86_400_000);
}

async function insertAlert(row: {
  caseReferralId: string;
  alertType: (typeof alerts.$inferInsert)["alertType"];
  dedupeKey: string;
  recipientId: string;
  payload?: string | null;
}): Promise<boolean> {
  const result = await db
    .insert(alerts)
    .values({
      caseReferralId: row.caseReferralId,
      alertType: row.alertType,
      dedupeKey: row.dedupeKey,
      recipientId: row.recipientId,
      payload: row.payload ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: alerts.id });
  return result.length > 0;
}

async function mlsUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(userProfile, eq(userProfile.userId, user.id))
    .where(and(eq(userProfile.role, "mls"), eq(userProfile.isActive, true)));
  return rows.map((r) => r.id);
}

// Evaluate a single day's alerts. Called by runAlerts, once per day of
// catch-up. `today` is the reference date for offsets.
async function evaluateFor(today: Date): Promise<number> {
  const todayYmd = ymd(today);
  let raised = 0;
  const mls = await mlsUserIds();

  const openCases = await db
    .select({
      id: caseReferrals.id,
      referralRef: caseReferrals.referralRef,
      status: caseReferrals.status,
      assignedOfficerId: caseReferrals.assignedOfficerId,
      responseDueDate: caseReferrals.responseDueDate,
      nextCourtDate: caseReferrals.nextCourtDate,
      lastActivityAt: caseReferrals.lastActivityAt,
      createdAt: caseReferrals.createdAt,
    })
    .from(caseReferrals)
    .where(
      and(
        eq(caseReferrals.isDeleted, false),
        inArray(caseReferrals.status, OPEN_STATUSES as unknown as (typeof caseReferrals.status.enumValues)),
      ),
    );

  for (const c of openCases) {
    const recipients: string[] = [];
    if (c.assignedOfficerId) recipients.push(c.assignedOfficerId);

    // ALT-M1-02 — response due / next court date
    for (const field of ["responseDueDate", "nextCourtDate"] as const) {
      const dateStr = c[field];
      if (!dateStr) continue;
      const delta = daysBetween(dateStr, todayYmd);
      if (DEADLINE_LEADS.includes(delta)) {
        for (const rid of recipients) {
          if (
            await insertAlert({
              caseReferralId: c.id,
              alertType: "deadline_lead",
              dedupeKey: `${field}:${dateStr}:d${delta}`,
              recipientId: rid,
              payload: JSON.stringify({ field, dateStr, delta }),
            })
          )
            raised++;
        }
      } else if (delta < 0) {
        // Overdue variant — alert officers + MLS once per (field:date)
        for (const rid of [...recipients, ...mls]) {
          if (
            await insertAlert({
              caseReferralId: c.id,
              alertType: "deadline_overdue",
              dedupeKey: `${field}:${dateStr}:overdue`,
              recipientId: rid,
              payload: JSON.stringify({ field, dateStr, delta }),
            })
          )
            raised++;
        }
      }
    }

    // ALT-M1-03 — inactivity
    const inactiveDays = daysBetween(
      todayYmd,
      ymd(c.lastActivityAt instanceof Date ? c.lastActivityAt : new Date(c.lastActivityAt)),
    );
    if (inactiveDays >= INACTIVITY_DAYS) {
      for (const rid of [...recipients, ...mls]) {
        if (
          await insertAlert({
            caseReferralId: c.id,
            alertType: "inactivity",
            dedupeKey: `inactive:${todayYmd}`,
            recipientId: rid,
            payload: JSON.stringify({ inactiveDays }),
          })
        )
          raised++;
      }
    }

    // ALT-M1-04 — unassigned RECEIVED
    const createdDays = daysBetween(
      todayYmd,
      ymd(c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)),
    );
    if (c.status === "received" && !c.assignedOfficerId && createdDays > UNASSIGNED_DAYS) {
      for (const rid of mls) {
        if (
          await insertAlert({
            caseReferralId: c.id,
            alertType: "unassigned",
            dedupeKey: `unassigned:${todayYmd}`,
            recipientId: rid,
          })
        )
          raised++;
      }
    }

    // ALT-M1-05 — missed settlement instalment
    await recomputeScheduleStates(c.id);
    const missed = await db
      .select({ id: settlementSchedule.id, instalmentNo: settlementSchedule.instalmentNo })
      .from(settlementSchedule)
      .where(
        and(
          eq(settlementSchedule.caseReferralId, c.id),
          eq(settlementSchedule.state, "missed"),
        ),
      );
    for (const m of missed) {
      for (const rid of [...recipients, ...mls]) {
        if (
          await insertAlert({
            caseReferralId: c.id,
            alertType: "missed_instalment",
            dedupeKey: `instalment:${m.instalmentNo}`,
            recipientId: rid,
            payload: JSON.stringify({ instalmentNo: m.instalmentNo }),
          })
        )
          raised++;
      }
    }
  }

  return raised;
}

// Public entry — call from the /api/cron/alerts route or a manual button.
export async function runAlerts(now: Date = new Date()): Promise<AlertJobResult> {
  const [lastRun] = await db
    .select({ forDate: alertJobRun.forDate })
    .from(alertJobRun)
    .where(eq(alertJobRun.success, true))
    .orderBy(sql`${alertJobRun.forDate} DESC`)
    .limit(1);

  const todayYmd = ymd(now);
  const startYmd = lastRun?.forDate
    ? ymd(new Date(new Date(lastRun.forDate).getTime() + 86_400_000))
    : todayYmd;

  const dates: string[] = [];
  {
    let cursor = new Date(startYmd);
    const end = new Date(todayYmd);
    while (cursor <= end) {
      dates.push(ymd(cursor));
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }

  let alertsRaised = 0;
  for (const d of dates) {
    try {
      alertsRaised += await evaluateFor(new Date(d));
      await db.insert(alertJobRun).values({ forDate: d, success: true });
    } catch (e) {
      await db
        .insert(alertJobRun)
        .values({ forDate: d, success: false, notes: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  return { runsExecuted: dates.length, alertsRaised, lastForDate: todayYmd };
}
