"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import type { Column } from "@/components/ui/DataTable";
import { ChevronRight, AlertCircle } from "lucide-react";
import type { CaseWithAssignee } from "@/db/types";

type CaseRow = CaseWithAssignee & Record<string, unknown>;

const TYPE_STYLES: Record<string, string> = {
  unpaid_contribution: "border border-primary text-primary",
  unpaid_surcharge:    "border border-blue-400 text-blue-500",
  wages_record:        "border border-highlight text-highlight-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  unpaid_contribution: "Contribution",
  unpaid_surcharge:    "Surcharge",
  wages_record:        "Wages record",
};

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-highlight/40 text-foreground not-italic rounded-sm px-px">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function formatSbd(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Table({
  cases,
  currentUserId,
  query = "",
}: {
  cases: CaseWithAssignee[];
  currentUserId?: string | null;
  query?: string;
}) {
  const router = useRouter();

  const columns: Column<CaseRow>[] = [
    {
      key: "referralRef",
      header: "Reference",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {highlight(String(v), query)}
          </span>
          {!row.isIntakeComplete && (
            <span title="Intake incomplete">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "employerName",
      header: "Employer",
      render: (v) => (
        <p className="text-sm font-medium text-foreground">{highlight(String(v), query)}</p>
      ),
    },
    {
      key: "referralDate",
      header: "Referral date",
      render: (v) => {
        const raw = String(v);
        const d = parse(raw, "yyyy-MM-dd", new Date());
        const display = isValid(d) ? format(d, "d MMM yyyy") : raw;
        return <span className="text-sm text-muted-foreground tabular-nums">{display}</span>;
      },
    },
    {
      key: "types",
      header: "Types",
      render: (v) => {
        const types = v as string[];
        if (!types?.length) return <span className="text-muted-foreground/60 text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <span
                key={t}
                className={`inline-block px-2 py-0.5 rounded-sm text-xs font-semibold ${TYPE_STYLES[t] ?? "border border-border text-muted-foreground"}`}
              >
                {TYPE_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "totalClaimed",
      header: "Claimed",
      align: "right",
      render: (v) => (
        <span className="text-sm text-foreground tabular-nums">SBD {formatSbd(v as string)}</span>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (v) => {
        const n = Number(v ?? 0);
        return (
          <span className={`text-sm tabular-nums ${n > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
            SBD {formatSbd(v as number)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <Badge status={v as BadgeStatus} solid />,
    },
    {
      key: "assigneeEmail",
      header: "Assigned to",
      render: (_, row) => {
        if (row.assignedOfficerId && row.assignedOfficerId === currentUserId) {
          return <span className="text-sm text-muted-foreground">Me</span>;
        }
        const display = row.assigneeName || row.assigneeEmail;
        return display ? (
          <span className="text-sm font-semibold text-primary">{String(display)}</span>
        ) : (
          <span className="text-sm text-muted-foreground/60">—</span>
        );
      },
    },
    {
      key: "id",
      header: "",
      align: "right",
      render: () => (
        <div className="flex items-center justify-end">
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
      ),
    },
  ];

  useEffect(() => {
    const es = new EventSource("/api/cases/stream");
    es.onmessage = () => router.refresh();
    es.onerror = () => es.close();
    return () => es.close();
  }, [router]);

  return (
    <DataTable
      columns={columns}
      data={cases as CaseRow[]}
      keyField="id"
      emptyMessage="No cases found."
      onRowClick={(row) => router.push(`/cases/${row.id}`)}
      className="min-h-[max(32rem,calc(100vh-18rem))]"
    />
  );
}
