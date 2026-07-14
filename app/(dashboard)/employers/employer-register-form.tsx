"use client";

import { useState } from "react";
import { X, Building2, Loader2 } from "lucide-react";
import { createEmployer } from "@/app/actions/create-employer";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground" +
  " focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors" +
  " placeholder:text-muted-foreground/60";

const labelCls = "block text-sm font-medium text-foreground mb-1.5";

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
      setError("This employer could not be saved. The name or code may already be in use — try a different value.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] bg-card rounded-md border border-border shadow-lg overflow-hidden">
      {/* Header — serif title per §5 dialog convention */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-secondary">
            <Building2 className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground leading-tight">Register employer</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add an employer to the registry.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls} htmlFor="er-name">Employer name</label>
          <input id="er-name" name="name" required placeholder="e.g. Solomon Airlines" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="er-code">Employer code</label>
          <input id="er-code" name="code" required placeholder="6-char code" maxLength={6} className={`${inputCls} tabular-nums`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="er-phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="er-phone" name="phone" placeholder="+677 XXXXX" className={`${inputCls} tabular-nums`} />
          </div>
          <div>
            <label className={labelCls} htmlFor="er-email">Email <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="er-email" name="email" type="email" placeholder="employer@example.com" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="er-address">Address <span className="font-normal text-muted-foreground">(optional)</span></label>
          <input id="er-address" name="address" placeholder="Street address" className={inputCls} />
        </div>

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Saving…" : "Register employer"}
          </button>
        </div>
      </form>
    </div>
  );
}
