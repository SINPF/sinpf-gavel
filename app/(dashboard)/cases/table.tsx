"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import type { Column } from "@/components/ui/DataTable";
import { ChevronRight } from "lucide-react";
import type { CaseWithAssignee } from "@/db/types";

type CaseRow = CaseWithAssignee & Record<string, unknown>;

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

export default function Table({ cases, currentUserId, query = "" }: { cases: CaseWithAssignee[]; currentUserId?: string | null; query?: string }) {
  const router = useRouter();

  const columns: Column<CaseRow>[] = [
    {
      key: "id",
      header: "Matter no.",
      render: (v) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {highlight(String(v).slice(0, 8).toUpperCase(), query)}
        </span>
      ),
    },
    {
      key: "employerName",
      header: "Employer",
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{highlight(String(v), query)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            {highlight(String(row.employerCode), query)}
          </p>
        </div>
      ),
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
                className="inline-block px-2 py-0.5 rounded-sm bg-secondary text-secondary-foreground text-xs font-medium"
              >
                {t.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "referralDate",
      header: "Referral date",
      render: (v) => (
        <span className="text-sm text-muted-foreground tabular-nums">{String(v)}</span>
      ),
    },
    {
      key: "grandTotalClaim",
      header: "Total claim",
      align: "right",
      render: (v) => (
        <span className="text-sm font-medium text-foreground tabular-nums">
          {Number(v).toLocaleString("en-AU", { style: "currency", currency: "SBD" })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <Badge status={v as BadgeStatus} />,
    },
    {
      key: "assigneeEmail",
      header: "Assigned to",
      render: (_, row) => {
        if (row.assignedTo && row.assignedTo === currentUserId) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-secondary text-secondary-foreground text-xs font-medium">
              Me
            </span>
          );
        }
        const display = row.assigneeName || row.assigneeEmail;
        return display ? (
          <span className="text-sm text-muted-foreground">{String(display)}</span>
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
    />
  );
}
