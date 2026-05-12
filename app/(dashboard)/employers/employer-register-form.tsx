"use client";

import { useState } from "react";
import { X, Building2, Loader2 } from "lucide-react";
import { createEmployer } from "@/app/actions/create-employer";
import { useRouter } from "next/navigation";

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all placeholder:text-muted-foreground/40";
const labelCls = "block text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1.5";

export default function EmployerRegisterForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createEmployer(new FormData(e.currentTarget));
      router.refresh();
      onClose();
    } catch {
      setError("Failed to register employer. Name or code may already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-blue/10">
            <Building2 className="w-4 h-4 text-brand-blue" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Register New Employer</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Add an employer to the system</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>Employer Name</label>
          <input name="name" required placeholder="e.g. Solomon Airlines" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Employer Code</label>
          <input name="code" required placeholder="6-char code" maxLength={6} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone <span className="normal-case font-medium">(optional)</span></label>
            <input name="phone" placeholder="+677 XXXXX" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email <span className="normal-case font-medium">(optional)</span></label>
            <input name="email" type="email" placeholder="employer@example.com" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Address <span className="normal-case font-medium">(optional)</span></label>
          <input name="address" placeholder="Street address" className={inputCls} />
        </div>

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Saving…" : "Register Employer"}
          </button>
        </div>
      </form>
    </div>
  );
}
