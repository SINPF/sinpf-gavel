"use client";

import { useState, useEffect, useRef } from "react";
import { type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { CaseFormValues } from "@/db/validator";
import { Search, ChevronDown, Building2 } from "lucide-react";

type EmployerOption = { id: string; name: string; code: string };

const inputClasses =
  "w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/30";
const labelClasses =
  "block text-sm font-medium text-foreground mb-2 ml-1";

function EmployerCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/employers")
      .then((r) => r.json())
      .then(setEmployers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = employers.find((e) => e.id === value);
  const filtered = employers.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.code.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery(""); }}
        className={`${inputClasses} flex items-center justify-between gap-2 text-left ${!selected ? "text-muted-foreground/50" : ""}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">{selected.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{selected.code}</span>
            </>
          ) : (
            "Select employer…"
          )}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-muted-foreground ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employers…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-muted/40 rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No employers found.</p>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => { onChange(emp.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted ${
                    emp.id === value ? "bg-blue-50 text-primary" : "text-foreground"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium">{emp.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{emp.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function General({
  register,
  setValue,
  watch,
}: {
  register: UseFormRegister<CaseFormValues>;
  setValue: UseFormSetValue<CaseFormValues>;
  watch: (field: keyof CaseFormValues) => unknown;
}) {
  const employerId = watch("employerId") as string ?? "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="md:col-span-2 flex flex-col">
        <label className={labelClasses}>Employer</label>
        <input type="hidden" {...register("employerId")} />
        <EmployerCombobox
          value={employerId}
          onChange={(id) => setValue("employerId", id, { shouldValidate: true })}
        />
      </div>

      <div className="flex flex-col">
        <label className={labelClasses}>Referral date</label>
        <input
          {...register("referralDate")}
          type="date"
          className={`${inputClasses} cursor-pointer`}
        />
      </div>
    </div>
  );
}
