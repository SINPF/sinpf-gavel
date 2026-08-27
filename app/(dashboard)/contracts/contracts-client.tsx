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
import { contractStatus, CONTRACT_STATUS_LABELS, type ContractStatus } from "@/lib/contract-status";
import { formatFinancialYear } from "@/lib/financial-year";

const PAGE_SIZE = 25;

type Row = {
  id: string;
  contractRef: string;
  title: string;
  parties: string[];
  contractType: string;
  startDate: string;
  endDate: string;
  financialYear: number;
  contractValue: string;
  currency: string;
  terminatedDate: string | null;
  owningDepartment: string | null;
  linkedTitleId: string | null;
  signedCount: number;
} & Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = {
  lease: "Lease",
  service_agreement: "Service agreement",
  mou: "MOU",
  supply: "Supply",
  consultancy: "Consultancy",
  other: "Other",
};

const STATUS_STYLES: Record<ContractStatus, string> = {
  active: "bg-primary text-white",
  expired: "bg-muted-foreground text-background",
  terminated: "bg-destructive/10 text-destructive",
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

function daysUntil(iso: string): number {
  const d = new Date(iso).getTime() - Date.now();
  return Math.ceil(d / 86_400_000);
}

export default function ContractsClient({
  contracts,
  canCreate,
}: {
  contracts: Row[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ContractStatus>("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"" | "30" | "60" | "90">("");
  const [fyFilter, setFyFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const fyOptions = useMemo(() => {
    const set = new Set<number>();
    for (const c of contracts) set.add(c.financialYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [contracts]);

  const withStatus = useMemo(
    () =>
      contracts.map((c) => ({
        ...c,
        _status: contractStatus({ endDate: c.endDate, terminatedDate: c.terminatedDate }),
      })),
    [contracts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus.filter((c) => {
      if (statusFilter && c._status !== statusFilter) return false;
      if (typeFilter && c.contractType !== typeFilter) return false;
      if (fyFilter && String(c.financialYear) !== fyFilter) return false;
      if (expiryFilter && c._status !== "expired") {
        const days = daysUntil(c.endDate);
        if (days < 0 || days > Number(expiryFilter)) return false;
      }
      if (q) {
        const inTitle = c.title.toLowerCase().includes(q);
        const inRef = c.contractRef.toLowerCase().includes(q);
        const inParty = c.parties.some((p) => p.toLowerCase().includes(q));
        if (!inTitle && !inRef && !inParty) return false;
      }
      return true;
    });
  }, [withStatus, query, statusFilter, typeFilter, expiryFilter, fyFilter]);

  const hasActiveFilters = !!query || !!statusFilter || !!typeFilter || !!expiryFilter || !!fyFilter;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  const columns: Column<Row & { _status: ContractStatus }>[] = [
    {
      key: "contractRef",
      header: "Reference",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tabular-nums">{String(v)}</span>
          {row.signedCount === 0 && row._status !== "terminated" && (
            <span title="No signed contract attached">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{String(v)}</p>
          <p className="text-xs text-muted-foreground truncate max-w-md">
            {row.parties.join(" · ")}
          </p>
        </div>
      ),
    },
    {
      key: "contractType",
      header: "Type",
      render: (v) => (
        <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold border border-border text-muted-foreground">
          {TYPE_LABELS[v as string] ?? String(v)}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Start",
      render: (v) => (
        <span className="text-sm text-muted-foreground tabular-nums">{fmtDate(v as string)}</span>
      ),
    },
    {
      key: "endDate",
      header: "End",
      render: (v, row) => {
        const days = daysUntil(v as string);
        const isSoon = row._status === "active" && days <= 90 && days >= 0;
        return (
          <span
            className={`text-sm tabular-nums ${
              isSoon ? "text-warning font-semibold" : "text-muted-foreground"
            }`}
          >
            {fmtDate(v as string)}
            {isSoon && ` · ${days}d`}
          </span>
        );
      },
    },
    {
      key: "financialYear",
      header: "FY",
      render: (v) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatFinancialYear(v as number)}
        </span>
      ),
    },
    {
      key: "contractValue",
      header: "Value",
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
            STATUS_STYLES[v as ContractStatus]
          }`}
        >
          {CONTRACT_STATUS_LABELS[v as ContractStatus]}
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
            Contracts register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every contract SINPF is party to, tracked across its lifecycle.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New contract
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
            placeholder="Search by title, reference, or party..."
            className="w-full pl-9 pr-4 h-10 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | ContractStatus);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
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
        <select
          value={expiryFilter}
          onChange={(e) => {
            setExpiryFilter(e.target.value as "" | "30" | "60" | "90");
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">Any expiry</option>
          <option value="30">Expiring ≤ 30 days</option>
          <option value="60">Expiring ≤ 60 days</option>
          <option value="90">Expiring ≤ 90 days</option>
        </select>
        <select
          value={fyFilter}
          onChange={(e) => {
            setFyFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All financial years</option>
          {fyOptions.map((y) => (
            <option key={y} value={String(y)}>
              FY {formatFinancialYear(y)}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {contracts.length} contract{contracts.length === 1 ? "" : "s"} matched
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("");
              setTypeFilter("");
              setExpiryFilter("");
              setFyFilter("");
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
          {contracts.length === 0 ? "No contracts registered yet." : "No contracts match those filters."}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            keyField="id"
            emptyMessage="No contracts."
            onRowClick={(row) => router.push(`/contracts/${row.id}`)}
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
