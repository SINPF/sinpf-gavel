"use client";

import { useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateEmployer } from "@/app/actions/update-employer";
import { deleteEmployer } from "@/app/actions/delete-employer";

const inputCls =
  "w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground" +
  " focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors" +
  " placeholder:text-muted-foreground/60";

const labelCls = "block text-sm font-medium text-foreground mb-1.5";

export type EmployerEditRow = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  caseCount: number;
};

export default function EmployerEditForm({
  emp,
  onClose,
}: {
  emp: EmployerEditRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [fields,        setFields]        = useState({
    name:    emp.name,
    code:    emp.code,
    phone:   emp.phone   ?? "",
    email:   emp.email   ?? "",
    address: emp.address ?? "",
  });

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateEmployer(emp.id, fields);
      router.refresh();
      onClose();
    } catch {
      setError("This employer could not be saved. The name or code may already be in use — try a different value.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (emp.caseCount > 0) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEmployer(emp.id);
      router.refresh();
      onClose();
    } catch {
      setError("Failed to delete employer.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] bg-card rounded-md border border-border shadow-lg overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border bg-muted/30">
        <h2 className="font-serif text-xl font-semibold text-foreground tracking-tight">
          Edit employer
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 space-y-4 bg-linear-to-br from-background via-blue-50 to-blue-100">
          <div>
            <label className={labelCls} htmlFor="ee-name">Employer name</label>
            <input id="ee-name" required value={fields.name} onChange={set("name")} placeholder="e.g. SINPF" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ee-code">Employer code</label>
            <input id="ee-code" required value={fields.code} onChange={set("code")} maxLength={6} placeholder="6-char code" className={`${inputCls} tabular-nums`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="ee-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="ee-phone" value={fields.phone} onChange={set("phone")} placeholder="XXXXX" className={`${inputCls} tabular-nums`} />
            </div>
            <div>
              <label className={labelCls} htmlFor="ee-email">Email <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="ee-email" type="email" value={fields.email} onChange={set("email")} placeholder="employer@example.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="ee-address">Address <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="ee-address" value={fields.address} onChange={set("address")} placeholder="Street address" className={inputCls} />
          </div>

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center gap-4">
          <DeleteControl
            caseCount={emp.caseCount}
            confirmDelete={confirmDelete}
            setConfirmDelete={setConfirmDelete}
            handleDelete={handleDelete}
            deleting={deleting}
            saving={saving}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting || !fields.name.trim() || !fields.code.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                saving || deleting
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
              }`}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function DeleteControl({
  caseCount, confirmDelete, setConfirmDelete, handleDelete, deleting, saving,
}: {
  caseCount: number;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  handleDelete: () => void;
  deleting: boolean;
  saving: boolean;
}) {
  if (caseCount > 0) {
    return (
      <span
        className="text-xs italic text-muted-foreground"
        title="Cannot delete: employer has linked cases"
      >
        {caseCount} linked {caseCount === 1 ? "case" : "cases"} — cannot delete
      </span>
    );
  }

  if (!confirmDelete) {
    return (
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        disabled={saving || deleting}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold text-destructive border border-destructive/30 hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/30">
      <span className="text-xs font-medium text-destructive">Delete permanently?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-colors"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Yes, delete
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(false)}
        disabled={deleting}
        className="px-2.5 py-1 rounded-sm text-xs font-semibold text-foreground hover:bg-background transition-colors"
      >
        Keep
      </button>
    </div>
  );
}
