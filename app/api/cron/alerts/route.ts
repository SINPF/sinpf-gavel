import { NextResponse } from "next/server";
import { runAlerts } from "@/lib/alerts";

// POST /api/cron/alerts — invoke the daily alert job.
// Auth: shared-secret via Authorization: Bearer <ALERT_CRON_SECRET>.
// External scheduler (cron, cloud scheduler) hits this once per day.
export async function POST(req: Request) {
  const secret = process.env.ALERT_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ALERT_CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
