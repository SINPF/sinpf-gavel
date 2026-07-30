"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
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
      <header className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border">
        <h2 className="font-serif text-xl font-semibold text-foreground tracking-tight">
          Register employer
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 space-y-4">
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

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex justify-end items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                loading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700"
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Saving…" : "Register employer"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
