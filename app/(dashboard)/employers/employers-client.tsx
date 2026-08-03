"use client";

import { type ReactNode, useState } from "react";
import { Plus, Search, Pencil, LayoutGrid, List, Upload } from "lucide-react";
import { IconPhone, IconMail, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import EmployerEditForm, { type EmployerEditRow } from "./employer-edit-form";
import EmployerImportForm from "./employer-import-form";

type EmployerRow = EmployerEditRow & { createdAt: Date };
type EmployerTableRow = EmployerRow & Record<string, unknown>;
type View = "grid" | "table";

function MetaItem({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  const empty = value === "—";
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
        {icon && <span className="opacity-70">{icon}</span>}
        {label}
      </span>
      <span className={`text-sm font-medium truncate tabular-nums ${empty ? "italic text-muted-foreground/40" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function EmployerCard({ emp, onEdit }: { emp: EmployerRow; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group w-full text-left bg-card border border-border rounded-md overflow-hidden transition-colors duration-150 cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-foreground leading-snug truncate min-w-0 flex-1">
          {emp.name}
        </h3>
        <span className="shrink-0 px-2 py-0.5 rounded-sm bg-muted-foreground text-background text-[11px] font-semibold tabular-nums">
          {emp.code}
        </span>
      </div>

      {/* Metadata grid */}
      <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
        <MetaItem
          icon={<IconPhone className="w-3 h-3" />}
          label="Phone"
          value={emp.phone ?? "—"}
        />
        <MetaItem
          icon={<IconMail className="w-3 h-3" />}
          label="Email"
          value={emp.email ?? "—"}
        />
        <MetaItem
          icon={<IconMapPin className="w-3 h-3" />}
          label="Address"
          value={emp.address ?? "—"}
        />
        <MetaItem
          label="Cases"
          value={String(emp.caseCount)}
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/40 flex items-center gap-2">
        <span className="flex-1" />
        <span className="text-xs font-medium text-primary">
          Edit employer →
        </span>
      </div>
    </button>
  );
}

const employerColumns: Column<EmployerTableRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (v) => <span className="text-sm font-semibold text-foreground">{String(v)}</span>,
  },
  {
    key: "code",
    header: "Code",
    render: (v) => (
      <span className="px-2 py-0.5 rounded-sm bg-muted-foreground text-background text-[11px] font-semibold tabular-nums">
        {String(v)}
      </span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    render: (v) =>
      v
        ? <span className="text-xs text-muted-foreground">{String(v)}</span>
        : <span className="text-xs italic text-muted-foreground/40">—</span>,
  },
  {
    key: "email",
    header: "Email",
    render: (v) =>
      v
        ? <span className="text-xs text-muted-foreground">{String(v)}</span>
        : <span className="text-xs italic text-muted-foreground/40">—</span>,
  },
  {
    key: "address",
    header: "Address",
    render: (v) =>
      v
        ? <span className="text-xs text-muted-foreground">{String(v)}</span>
        : <span className="text-xs italic text-muted-foreground/40">—</span>,
  },
  {
    key: "caseCount",
    header: "Cases",
    render: (v) => (
      <span className="text-xs text-muted-foreground tabular-nums">{String(v)}</span>
    ),
  },
  {
    key: "id",
    header: "",
    align: "right",
    render: () => (
      <div className="flex items-center justify-end">
        <Pencil className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
    ),
  },
];

export default function EmployersClient({ employers }: { employers: EmployerRow[] }) {
  const [query, setQuery]         = useState("");
  const [view,  setView]          = useState<View>("table");
  const [editing, setEditing]     = useState<EmployerRow | null>(null);
  const [importing, setImporting] = useState(false);

  const filtered = employers.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 pb-4 border-b border-border flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-4">
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
            Employers
          </h1>
          <p className="text-sm text-muted-foreground">
            Registered organisations and their case history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Import
          </button>
          <Link
            href="/employers/register"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Register employer
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative group w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or code…"
            className="w-full pl-9 pr-4 h-10 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-md border border-border bg-background overflow-hidden">
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid view"
            className={`flex items-center justify-center w-10 h-10 transition-colors ${
              view === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            title="Table view"
            className={`flex items-center justify-center w-10 h-10 transition-colors ${
              view === "table" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No employers found.</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <EmployerCard key={emp.id} emp={emp} onEdit={() => setEditing(emp)} />
          ))}
        </div>
      ) : (
        <DataTable
          columns={employerColumns}
          data={filtered as EmployerTableRow[]}
          keyField="id"
          emptyMessage="No employers found."
          onRowClick={(row) => setEditing(row)}
        />
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <EmployerEditForm emp={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}

      {importing && (
        <Modal onClose={() => setImporting(false)}>
          <EmployerImportForm onClose={() => setImporting(false)} />
        </Modal>
      )}
    </div>
  );
}
