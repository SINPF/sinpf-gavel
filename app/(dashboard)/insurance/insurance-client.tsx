"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  insurancePolicyStatus,
  INSURANCE_POLICY_STATUS_LABELS,
  daysToExpiry,
  type InsurancePolicyStatus,
} from "@/lib/insurance-policy-status";

const PAGE_SIZE = 25;

type Row = {
  id: string;
  policyRef: string;
  policyNumber: string;
  insurerName: string;
  policyType: string;
  insuredSubject: string;
  coverageStart: string;
  coverageEnd: string;
  policyValue: string;
  currency: string;
  linkedTitleId: string | null;
  scheduleCount: number;
} & Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = {
  medical: "Medical",
  property: "Property",
};

const STATUS_STYLES: Record<InsurancePolicyStatus, string> = {
  active: "bg-primary text-white",
  expiring_soon: "bg-warning/15 text-warning",
  expired: "bg-muted-foreground text-background",
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "d MMM yyyy") : v;
}
function fmtMoney(v: string | number, currency: string) {
  const n = Number(v ?? 0);
  return `${currency.toUpperCase()} ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InsuranceClient({
  policies,
  canCreate,
}: {
  policies: Row[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | InsurancePolicyStatus>("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const withStatus = useMemo(
    () =>
      policies.map((p) => ({
        ...p,
        _status: insurancePolicyStatus({ coverageEnd: p.coverageEnd }),
      })),
    [policies],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus.filter((p) => {
      if (statusFilter && p._status !== statusFilter) return false;
      if (typeFilter && p.policyType !== typeFilter) return false;
      if (q) {
        const inRef = p.policyRef.toLowerCase().includes(q);
        const inNumber = p.policyNumber.toLowerCase().includes(q);
        const inInsurer = p.insurerName.toLowerCase().includes(q);
        const inSubject = p.insuredSubject.toLowerCase().includes(q);
        if (!inRef && !inNumber && !inInsurer && !inSubject) return false;
      }
      return true;
    });
  }, [withStatus, query, statusFilter, typeFilter]);

  const hasActiveFilters = !!query || !!statusFilter || !!typeFilter;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  const columns: Column<Row & { _status: InsurancePolicyStatus }>[] = [
    {
      key: "policyRef",
      header: "Reference",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {String(v)}
          </span>
          {row.scheduleCount === 0 && (
            <span title="No policy schedule attached">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "insurerName",
      header: "Insurer",
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{String(v)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            #{row.policyNumber}
          </p>
        </div>
      ),
    },
    {
      key: "policyType",
      header: "Type",
      render: (v) => (
        <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold border border-border text-muted-foreground">
          {TYPE_LABELS[v as string] ?? String(v)}
        </span>
      ),
    },
    {
      key: "insuredSubject",
      header: "Insured subject",
      render: (v) => (
        <p className="text-sm text-foreground truncate max-w-xs">{String(v)}</p>
      ),
    },
    {
      key: "coverageEnd",
      header: "Expires",
      render: (v, row) => {
        const days = daysToExpiry(v as string) ?? 0;
        const soon = row._status === "expiring_soon";
        const gone = row._status === "expired";
        return (
          <span
            className={`text-sm tabular-nums ${
              soon
                ? "text-warning font-semibold"
                : gone
                  ? "text-muted-foreground"
                  : "text-foreground"
            }`}
          >
            {fmtDate(v as string)}
            {soon && ` · ${days}d`}
            {gone && ` · ${Math.abs(days)}d ago`}
          </span>
        );
      },
    },
    {
      key: "policyValue",
      header: "Sum insured",
      align: "right",
      render: (v, row) => (
        <span className="text-sm text-foreground tabular-nums">
          {fmtMoney(v as string, row.currency)}
        </span>
      ),
    },
    {
      key: "_status",
      header: "Status",
      render: (v) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold ${
            STATUS_STYLES[v as InsurancePolicyStatus]
          }`}
        >
          {INSURANCE_POLICY_STATUS_LABELS[v as InsurancePolicyStatus]}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      align: "right",
      render: () => (
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
            Insurance register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Medical and property policies SINPF holds, with expiry watch.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/insurance/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New policy
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative group flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by reference, policy number, insurer, or insured subject..."
            className="w-full pl-9 pr-4 h-10 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | InsurancePolicyStatus);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring soon</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {policies.length} polic
            {policies.length === 1 ? "y" : "ies"} matched
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("");
              setTypeFilter("");
              setPage(1);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {policies.length === 0
            ? "No policies registered yet."
            : "No policies match those filters."}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            keyField="id"
            emptyMessage="No policies."
            onRowClick={(row) => router.push(`/insurance/${row.id}`)}
            className="min-h-[max(28rem,calc(100vh-22rem))]"
          />
          <div className="flex items-center justify-between px-1">
            <p className="text-[12px] text-muted-foreground">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="px-3 py-1.5 text-sm font-semibold text-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
