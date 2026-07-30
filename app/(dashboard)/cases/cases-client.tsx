"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronDown, Check, ListFilter, UserCheck, X, Building2, Archive } from "lucide-react";
import Table from "./table";
import type { CaseWithAssignee } from "@/db/types";

const PAGE_SIZE = 25;

// Dot colors track the Badge status families defined in components/ui/Badge.tsx
const STATUS_OPTIONS: { value: string; label: string; dot: string }[] = [
  { value: "",              label: "All statuses",  dot: "bg-muted-foreground/40" },
  { value: "registered",    label: "Registered",    dot: "bg-primary" },
  { value: "assessment",    label: "Assessment",    dot: "bg-primary" },
  { value: "demand_issued", label: "Demand issued", dot: "bg-highlight" },
  { value: "negotiation",   label: "Negotiation",   dot: "bg-highlight" },
  { value: "prosecution",   label: "Prosecution",   dot: "bg-destructive" },
  { value: "in_progress",   label: "In progress",   dot: "bg-highlight" },
  { value: "resolved",      label: "Resolved",      dot: "bg-success" },
  { value: "closed",        label: "Closed",        dot: "bg-muted-foreground/60" },
];

const TYPE_OPTIONS: { value: string; label: string; dot: string }[] = [
  { value: "",                     label: "All types",    dot: "bg-muted-foreground/40" },
  { value: "unpaid_contributions", label: "Contributions", dot: "bg-primary" },
  { value: "unpaid_surcharges",    label: "Surcharges",    dot: "bg-blue-400" },
  { value: "wages_record",         label: "Wages record",  dot: "bg-highlight" },
];

function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; dot: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 h-10 px-3.5 rounded-md border text-sm font-medium transition-all ${
          value
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-background text-foreground hover:border-primary/50"
        }`}
      >
        <ListFilter className="w-3.5 h-3.5 shrink-0" />
        <span className="flex items-center gap-1.5">
          {value && <span className={`w-2 h-2 rounded-full shrink-0 ${selected.dot}`} />}
          {selected.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-48 rounded-md border border-border bg-background shadow-md overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? "bg-accent text-primary font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
              <span className="flex-1 text-left">{opt.label}</span>
              {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type EmployerOption = { id: string; name: string; code: string };

function EmployerFilter({
  value,
  employers,
  onChange,
}: {
  value: string;
  employers: EmployerOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = employers.find((e) => e.id === value);
  const filtered = employers.filter(
    (e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className={`flex items-center gap-2 h-10 px-3.5 rounded-md border text-sm font-medium transition-all ${
          value
            ? "border-primary bg-primary/5 text-primary"
            : "border-border bg-background text-foreground hover:border-primary/50"
        }`}
      >
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="max-w-35 truncate">{selected ? selected.name : "All Employers"}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 rounded-md border border-border bg-background shadow-md overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search employers…"
                className="w-full pl-7 pr-3 py-1.5 text-sm bg-muted/40 rounded-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                !value ? "bg-accent text-primary font-semibold" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="flex-1 text-left">All Employers</span>
              {!value && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
            {filtered.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => { onChange(emp.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                  emp.id === value ? "bg-accent text-primary font-semibold" : "text-foreground hover:bg-muted"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-left truncate">{emp.name}</span>
                {emp.id === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CasesClient({
  cases,
  employers,
  currentUserId,
  initialMyCases  = false,
  initialCaseType = "",
}: {
  cases: CaseWithAssignee[];
  employers: EmployerOption[];
  currentUserId: string | null;
  initialMyCases?: boolean;
  initialCaseType?: string;
}) {
  const [query,      setQuery]      = useState("");
  const [status,     setStatus]     = useState("");
  const [caseType,   setCaseType]   = useState(initialCaseType);
  const [employerId, setEmployerId] = useState("");
  const [myCases,    setMyCases]    = useState(initialMyCases);
  const [showClosed, setShowClosed] = useState(false);
  const [page,     setPage]     = useState(1);

  const hasActiveFilters = !!query || !!status || !!caseType || !!employerId || myCases || showClosed;

  const clearFilters = () => {
    setQuery(""); setStatus(""); setCaseType(""); setEmployerId(""); setMyCases(false); setShowClosed(false); setPage(1);
  };

  const closedCount = useMemo(() => cases.filter((c) => c.status === "closed").length, [cases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (!showClosed && status !== "closed" && c.status === "closed") return false;
      const matchesQuery    = !q          || c.employerName.toLowerCase().includes(q) || c.employerCode.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      const matchesStatus   = !status     || c.status === status;
      const matchesType     = !caseType   || c.types.includes(caseType);
      const matchesEmployer = !employerId || c.employerId === employerId;
      const matchesMine     = !myCases    || c.assignedTo === currentUserId;
      return matchesQuery && matchesStatus && matchesType && matchesEmployer && matchesMine;
    });
  }, [cases, query, status, caseType, employerId, myCases, currentUserId, showClosed]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start       = (currentPage - 1) * PAGE_SIZE;
  const paginated   = filtered.slice(start, start + PAGE_SIZE);

  const handleQuery      = (v: string) => { setQuery(v);           setPage(1); };
  const handleStatus     = (v: string) => { setStatus(v);          setPage(1); };
  const handleCaseType   = (v: string) => { setCaseType(v);        setPage(1); };
  const handleEmployerId = (v: string) => { setEmployerId(v);      setPage(1); };
  const handleMyCases    = ()          => { setMyCases((m) => !m); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative group flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Search by employer or case ID..."
            className="w-full pl-9 pr-4 h-10 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <FilterDropdown value={status}   options={STATUS_OPTIONS} onChange={handleStatus}   />
        <FilterDropdown value={caseType} options={TYPE_OPTIONS}   onChange={handleCaseType} />
        <EmployerFilter value={employerId} employers={employers} onChange={handleEmployerId} />

        <button
          type="button"
          onClick={handleMyCases}
          className={`flex items-center gap-2 h-10 px-3.5 rounded-md border text-sm font-medium transition-all ${
            myCases
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-background text-foreground hover:border-primary/50"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          My Cases
          <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
            myCases ? "bg-primary border-primary" : "border-border"
          }`}>
            {myCases && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setShowClosed((v) => !v); setPage(1); }}
          className={`flex items-center gap-2 h-10 px-3.5 rounded-md border text-sm font-medium transition-all ${
            showClosed
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-background text-foreground hover:border-primary/50"
          }`}
        >
          <Archive className="w-3.5 h-3.5 shrink-0" />
          Closed
          <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
            showClosed ? "bg-primary border-primary" : "border-border"
          }`}>
            {showClosed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </span>
        </button>

      </div>

      {/* Filtered count + clear — only shown when filters are active */}
      {hasActiveFilters && (
        <div className="flex items-center gap-3 px-1">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {cases.length} {cases.length === 1 ? "case" : "cases"} matched
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        </div>
      )}

      {/* Closed-cases hidden notice — always visible when closed cases exist and are hidden */}
      {!showClosed && status !== "closed" && closedCount > 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          {closedCount} closed {closedCount === 1 ? "case" : "cases"} hidden
        </p>
      )}

      {/* Table + pagination (only when there are results) */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No cases found.</div>
      ) : (
        <>
          <Table cases={paginated} currentUserId={currentUserId} query={query} />

          <div className="flex items-center justify-between px-1">
            <p className="text-[12px] text-muted-foreground">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length} case{filtered.length !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
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
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
