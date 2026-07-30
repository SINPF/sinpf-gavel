"use client";

import { useState } from "react";
import { Plus, Building2, Search, Phone, MapPin, Briefcase, Pencil, Check, Loader2, Mail, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { updateEmployer } from "@/app/actions/update-employer";

type EmployerRow = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
  caseCount: number;
};

type View = "grid" | "table";

const inputCls = "w-full px-4 py-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40";
const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5";

function useEditState(emp: EmployerRow) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [fields,  setFields]  = useState({
    name:    emp.name,
    code:    emp.code,
    phone:   emp.phone   ?? "",
    email:   emp.email   ?? "",
    address: emp.address ?? "",
  });

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateEmployer(emp.id, fields);
      setEditing(false);
    } catch {
      setError("Failed to save. Name or code may already be in use.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFields({ name: emp.name, code: emp.code, phone: emp.phone ?? "", email: emp.email ?? "", address: emp.address ?? "" });
    setEditing(false);
    setError(null);
  };

  return { editing, setEditing, saving, error, fields, set, handleSave, handleCancel };
}

function EditableCard({ emp }: { emp: EmployerRow }) {
  const { editing, setEditing, saving, error, fields, set, handleSave, handleCancel } = useEditState(emp);

  if (editing) {
    return (
      <div className="p-5 rounded-md border border-primary/40 bg-background shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2.5 rounded-md bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary">Editing</span>
        </div>
        <div className="space-y-2">
          <div>
            <label className={labelCls}>Name</label>
            <input value={fields.name} onChange={set("name")} className={inputCls} placeholder="e.g. Solomon Airlines" />
          </div>
          <div>
            <label className={labelCls}>Code</label>
            <input value={fields.code} onChange={set("code")} className={inputCls} maxLength={6} placeholder="6-char code" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={fields.phone} onChange={set("phone")} className={inputCls} placeholder="+677 XXXXX" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={fields.email} onChange={set("email")} type="email" className={inputCls} placeholder="employer@example.com" />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input value={fields.address} onChange={set("address")} className={inputCls} placeholder="Street address" />
          </div>
        </div>
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !fields.name.trim() || !fields.code.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-md border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-snug truncate">{emp.name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-sm bg-muted text-muted-foreground text-[11px] font-medium tabular-nums">
            {emp.code}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
          title="Edit employer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-5 pb-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <Phone className="w-3 h-3 shrink-0 text-muted-foreground" />
          {emp.phone
            ? <span className="text-muted-foreground">{emp.phone}</span>
            : <span className="italic text-muted-foreground/40">No phone</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Mail className="w-3 h-3 shrink-0 text-muted-foreground" />
          {emp.email
            ? <span className="text-muted-foreground truncate">{emp.email}</span>
            : <span className="italic text-muted-foreground/40">No email</span>}
        </div>
        {emp.address && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{emp.address}</span>
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
        <Briefcase className="w-3.5 h-3.5 shrink-0" />
        <span>{emp.caseCount} {emp.caseCount === 1 ? "case" : "cases"}</span>
      </div>
    </div>
  );
}

function EditableTableRow({ emp }: { emp: EmployerRow }) {
  const { editing, setEditing, saving, error, fields, set, handleSave, handleCancel } = useEditState(emp);

  if (editing) {
    return (
      <tr className="bg-primary/5 border-y border-primary/20">
        <td colSpan={7} className="px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
            <div>
              <label className={labelCls}>Name</label>
              <input value={fields.name} onChange={set("name")} className={inputCls} placeholder="e.g. Solomon Airlines" />
            </div>
            <div>
              <label className={labelCls}>Code</label>
              <input value={fields.code} onChange={set("code")} className={inputCls} maxLength={6} placeholder="6-char code" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={fields.phone} onChange={set("phone")} className={inputCls} placeholder="+677 XXXXX" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={fields.email} onChange={set("email")} type="email" className={inputCls} placeholder="employer@example.com" />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input value={fields.address} onChange={set("address")} className={inputCls} placeholder="Street address" />
            </div>
          </div>
          {error && <p className="text-xs text-destructive font-medium mb-2">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !fields.name.trim() || !fields.code.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-all"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group border-b border-border hover:bg-muted/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{emp.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground text-[11px] font-medium tabular-nums">
          {emp.code}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {emp.phone ?? <span className="italic text-muted-foreground/40">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {emp.email ?? <span className="italic text-muted-foreground/40">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {emp.address ?? <span className="italic text-muted-foreground/40">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3 h-3 shrink-0" />
          {emp.caseCount}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit employer"
          className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function EmployersClient({ employers }: { employers: EmployerRow[] }) {
  const [query, setQuery] = useState("");
  const [view,  setView]  = useState<View>("grid");

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
        <Link
          href="/employers/register"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Register employer
        </Link>
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
            <EditableCard key={emp.id} emp={emp} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cases</th>
                <th className="px-4 py-3 w-10"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <EditableTableRow key={emp.id} emp={emp} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
