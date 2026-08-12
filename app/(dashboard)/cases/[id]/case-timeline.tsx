"use client";

// FR-M1-016 — case history timeline. Merges status changes, actions,
// payments and document uploads into one chronological view.

import { useMemo, useState } from "react";
import { format, parse, isValid } from "date-fns";
import { STATUS_LABELS, type BadgeStatus } from "@/components/ui/Badge";
import type { ReferralDetail } from "@/db/types";
import { FileText, Gavel, ArrowRight, DollarSign } from "lucide-react";

type EventKind = "status" | "action" | "payment" | "document";

type TimelineEvent = {
  kind: EventKind;
  at: Date;
  title: React.ReactNode;
  meta: string;
  detail?: React.ReactNode;
};

const ACTION_LABELS: Record<string, string> = {
  demand_letter_issued: "Demand letter issued",
  notice_served: "Notice served",
  employer_meeting: "Employer meeting",
  phone_follow_up: "Phone follow-up",
  site_visit: "Site visit",
  affidavit_prepared: "Affidavit prepared",
  court_appearance: "Court appearance",
  deed_executed: "Deed executed",
  other: "Other action",
};

function fmtSbd(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return "SBD " + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  // yyyy-MM-dd (payments, actions) or an ISO timestamp
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : new Date(v);
}

const kindStyles: Record<EventKind, { bg: string; icon: React.ReactNode }> = {
  status:   { bg: "bg-primary/10 text-primary",     icon: <ArrowRight className="w-3.5 h-3.5" /> },
  action:   { bg: "bg-blue-100 text-primary",       icon: <Gavel className="w-3.5 h-3.5" /> },
  payment:  { bg: "bg-success/10 text-success",     icon: <DollarSign className="w-3.5 h-3.5" /> },
  document: { bg: "bg-muted text-muted-foreground", icon: <FileText className="w-3.5 h-3.5" /> },
};

const FILTER_OPTIONS: { value: EventKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "status", label: "Status changes" },
  { value: "action", label: "Actions" },
  { value: "payment", label: "Payments" },
  { value: "document", label: "Documents" },
];

export function CaseTimeline({ referral }: { referral: ReferralDetail }) {
  const [filter, setFilter] = useState<EventKind | "all">("all");

  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];

    for (const h of referral.statusHistory) {
      out.push({
        kind: "status",
        at: parseDate(h.changedAt as unknown as Date),
        title: h.fromStatus ? (
          <>
            <span className="text-muted-foreground">
              {STATUS_LABELS[h.fromStatus as BadgeStatus] ?? h.fromStatus}
            </span>{" "}
            → <span className="font-semibold">{STATUS_LABELS[h.toStatus as BadgeStatus] ?? h.toStatus}</span>
          </>
        ) : (
          <span className="font-semibold">Referral created</span>
        ),
        meta: `${h.changedByName ?? h.changedByEmail ?? "system"}${h.reason ? " · reason recorded" : ""}`,
        detail: h.reason ? <p className="italic text-muted-foreground">{h.reason}</p> : undefined,
      });
    }

    for (const a of referral.actions) {
      out.push({
        kind: "action",
        at: parseDate(a.actionDate),
        title: <span className="font-semibold">{ACTION_LABELS[a.actionType] ?? a.actionType}</span>,
        meta: `${a.performerName ?? a.performerEmail ?? "unknown"}`,
        detail: <p className="text-foreground">{a.notes}</p>,
      });
    }

    for (const p of referral.payments) {
      const totalAmount = Number(p.amountContribution ?? 0) + Number(p.amountSurcharge ?? 0);
      out.push({
        kind: "payment",
        at: parseDate(p.paymentDate),
        title: (
          <span className={p.isReversed ? "line-through text-muted-foreground" : "font-semibold"}>
            {p.isReversed && <span className="not-italic no-underline text-destructive mr-1">Reversed:</span>}
            Payment {fmtSbd(totalAmount)}
          </span>
        ),
        meta: `${p.recordedByName ?? p.recordedByEmail ?? "system"}${p.receiptReference ? ` · Rcpt ${p.receiptReference}` : ""}`,
        detail: p.reversalReason ? (
          <p className="italic text-destructive">Reversal reason: {p.reversalReason}</p>
        ) : undefined,
      });
    }

    for (const d of referral.documents) {
      out.push({
        kind: "document",
        at: parseDate(d.uploadedAt as unknown as Date),
        title: (
          <>
            Uploaded <span className="font-semibold">{d.fileName}</span>
          </>
        ),
        meta: `${d.documentType}`,
      });
    }

    return out.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [referral]);

  const filtered = filter === "all" ? events : events.filter((e) => e.kind === filter);

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">Case history</h2>
        <div className="inline-flex items-center rounded-md bg-muted p-0.5">
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilter(o.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm ${
                filter === o.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events to show.</p>
      ) : (
        <ol className="space-y-3">
          {filtered.map((e, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${kindStyles[e.kind].bg}`}
              >
                {kindStyles[e.kind].icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {format(e.at, "d MMM yyyy · HH:mm")} · {e.meta}
                </p>
                {e.detail && <div className="mt-1 text-sm">{e.detail}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
