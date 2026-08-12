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
  History,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  LEGAL_OPINION_STATE_LABELS,
  type LegalOpinionState,
} from "@/lib/legal-opinion-state";

const PAGE_SIZE = 25;

type Row = {
  id: string;
  opinionRef: string;
  subjectMatter: string;
  requestingDepartment: string;
  opinionDate: string;
  state: string;
  keywords: string[];
  supersedesOpinionId: string | null;
  authorId: string;
  authorName: string | null;
  signedCount: number;
  supersededById: string | null;
  supersededByRef: string | null;
} & Record<string, unknown>;

const STATE_STYLES: Record<LegalOpinionState, string> = {
  draft: "bg-warning/15 text-warning",
  finalised: "bg-primary text-white",
};

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = parse(v, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "d MMM yyyy") : v;
}

export default function LegalOpinionsClient({
  opinions,
  canCreate,
}: {
  opinions: Row[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"" | LegalOpinionState>("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(1);

  const departments = useMemo(() => {
    const seen = new Set<string>();
    for (const o of opinions) {
      if (o.requestingDepartment) seen.add(o.requestingDepartment);
    }
    return Array.from(seen).sort();
  }, [opinions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opinions.filter((o) => {
      if (stateFilter && o.state !== stateFilter) return false;
      if (deptFilter && o.requestingDepartment !== deptFilter) return false;
      if (q) {
        const inRef = o.opinionRef.toLowerCase().includes(q);
        const inSubject = o.subjectMatter.toLowerCase().includes(q);
        const inDept = o.requestingDepartment.toLowerCase().includes(q);
        const inAuthor = (o.authorName ?? "").toLowerCase().includes(q);
        const inKeywords = o.keywords.some((k) => k.toLowerCase().includes(q));
        if (!inRef && !inSubject && !inDept && !inAuthor && !inKeywords) return false;
      }
      return true;
    });
  }, [opinions, query, stateFilter, deptFilter]);

  const hasActiveFilters = !!query || !!stateFilter || !!deptFilter;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: "opinionRef",
      header: "Reference",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {String(v)}
          </span>
          {row.state === "draft" && row.signedCount === 0 && (
            <span title="No signed opinion attached">
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
            </span>
          )}
          {row.supersedesOpinionId && (
            <span title="Supersedes an earlier opinion">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "subjectMatter",
      header: "Subject",
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-foreground truncate max-w-md">
            {String(v)}
          </p>
          {row.keywords.length > 0 && (
            <p className="text-xs text-muted-foreground truncate max-w-md">
              {row.keywords.map((k) => `#${k}`).join(" ")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "requestingDepartment",
      header: "Requested by",
      render: (v) => (
        <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-semibold border border-border text-muted-foreground">
          {String(v)}
        </span>
      ),
    },
    {
      key: "authorName",
      header: "Author",
      render: (v) => (
        <span className="text-sm text-foreground">{v ? String(v) : "—"}</span>
      ),
    },
    {
      key: "opinionDate",
      header: "Date",
      render: (v) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {fmtDate(v as string)}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold ${
              STATE_STYLES[v as LegalOpinionState]
            }`}
          >
            {LEGAL_OPINION_STATE_LABELS[v as LegalOpinionState]}
          </span>
          {row.supersededByRef && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-muted-foreground text-background"
              title={`Superseded by ${row.supersededByRef}`}
            >
              Superseded
            </span>
          )}
        </div>
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
            Legal opinions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            LSD's institutional advice, searchable and immutable once finalised.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/legal-opinions/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New opinion
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
            placeholder="Search by subject, keyword, department, author or reference..."
            className="w-full pl-9 pr-4 h-10 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value as "" | LegalOpinionState);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All states</option>
          <option value="draft">Draft</option>
          <option value="finalised">Finalised</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {opinions.length} opinion
            {opinions.length === 1 ? "" : "s"} matched
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStateFilter("");
              setDeptFilter("");
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
          {opinions.length === 0
            ? "No legal opinions recorded yet."
            : "No opinions match those filters."}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            keyField="id"
            emptyMessage="No opinions."
            onRowClick={(row) => router.push(`/legal-opinions/${row.id}`)}
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
