"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Link2,
  ShieldAlert,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  TITLE_OWNERSHIP_TYPE_LABELS,
  type TitleOwnershipType,
} from "@/lib/title-utils";

const PAGE_SIZE = 25;

type Row = {
  id: string;
  titleNumber: string;
  location: string;
  ownershipType: string;
  registeredOwner: string | null;
  termEnd: string | null;
  activeEncumbranceCount: number;
  documentCount: number;
  linkedContractCount: number;
} & Record<string, unknown>;

export default function TitlesClient({
  titlesData,
  canCreate,
}: {
  titlesData: Row[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<"" | TitleOwnershipType>("");
  const [encumberedFilter, setEncumberedFilter] = useState<"" | "yes" | "no">("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return titlesData.filter((t) => {
      if (ownershipFilter && t.ownershipType !== ownershipFilter) return false;
      if (encumberedFilter === "yes" && t.activeEncumbranceCount === 0) return false;
      if (encumberedFilter === "no" && t.activeEncumbranceCount > 0) return false;
      if (q) {
        const inNumber = t.titleNumber.toLowerCase().includes(q);
        const inLocation = t.location.toLowerCase().includes(q);
        const inOwner = (t.registeredOwner ?? "").toLowerCase().includes(q);
        if (!inNumber && !inLocation && !inOwner) return false;
      }
      return true;
    });
  }, [titlesData, query, ownershipFilter, encumberedFilter]);

  const hasActiveFilters = !!query || !!ownershipFilter || !!encumberedFilter;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: "titleNumber",
      header: "Title number",
      render: (v) => (
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {String(v)}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (v) => (
        <p className="text-sm text-foreground truncate max-w-md">{String(v)}</p>
      ),
    },
    {
      key: "ownershipType",
      header: "Ownership",
      render: (v) => (
        <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold border border-border text-muted-foreground">
          {TITLE_OWNERSHIP_TYPE_LABELS[v as TitleOwnershipType] ?? String(v)}
        </span>
      ),
    },
    {
      key: "registeredOwner",
      header: "Registered owner",
      render: (v) => (
        <span className="text-sm text-foreground">{v ? String(v) : "—"}</span>
      ),
    },
    {
      key: "activeEncumbranceCount",
      header: "Encumbered",
      align: "right",
      render: (v) => {
        const n = Number(v);
        if (n === 0) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-warning/15 text-warning">
            <ShieldAlert className="w-3.5 h-3.5" />
            {n} active
          </span>
        );
      },
    },
    {
      key: "documentCount",
      header: "Docs",
      align: "right",
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
          <FileText className="w-3.5 h-3.5" />
          {Number(v)}
        </span>
      ),
    },
    {
      key: "linkedContractCount",
      header: "Contracts",
      align: "right",
      render: (v) => {
        const n = Number(v);
        if (n === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <Link2 className="w-3.5 h-3.5" />
            {n}
          </span>
        );
      },
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
            Title register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Land and property titles SINPF holds, with encumbrances tracked to
            discharge.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/titles/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New title
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
            placeholder="Search by title number, location or registered owner..."
            className="w-full pl-9 pr-4 h-10 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={ownershipFilter}
          onChange={(e) => {
            setOwnershipFilter(e.target.value as "" | TitleOwnershipType);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All ownership types</option>
          {Object.entries(TITLE_OWNERSHIP_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={encumberedFilter}
          onChange={(e) => {
            setEncumberedFilter(e.target.value as "" | "yes" | "no");
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">Any encumbrance status</option>
          <option value="yes">Has active encumbrance</option>
          <option value="no">No active encumbrance</option>
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {titlesData.length} title
            {titlesData.length === 1 ? "" : "s"} matched
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOwnershipFilter("");
              setEncumberedFilter("");
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
          {titlesData.length === 0
            ? "No titles registered yet."
            : "No titles match those filters."}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            keyField="id"
            emptyMessage="No titles."
            onRowClick={(row) => router.push(`/titles/${row.id}`)}
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
