"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, User } from "lucide-react";

type UserOption = { id: string; name: string; email: string };

const inputClasses =
  "w-full px-4 py-3 rounded-md border border-border bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring transition-colors placeholder:text-muted-foreground/30";
const labelClasses =
  "block text-sm font-medium text-foreground mb-2 ml-1";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export default function Assignment({
  value,
  onChange,
  currentUserId,
}: {
  value: string;
  onChange: (id: string) => void;
  currentUserId: string | null;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = users.find((u) => u.id === value);
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <label className={labelClasses}>Assign case referral to</label>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => { setOpen((o) => !o); setQuery(""); }}
            className={`${inputClasses} flex items-center justify-between gap-2 text-left ${!selected ? "text-muted-foreground/50" : ""}`}
          >
            <span className="flex items-center gap-3 truncate">
              {selected ? (
                <>
                  <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                    {initials(selected.name)}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{selected.name}</span>
                      {selected.id === currentUserId && (
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Me</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{selected.email}</span>
                  </span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 shrink-0" />
                  Select assignee…
                </>
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
                    placeholder="Search users…"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-muted/40 rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No users found.</p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { onChange(u.id); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted ${
                        u.id === value ? "bg-blue-50" : ""
                      }`}
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                        {initials(u.name)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className={`font-medium truncate ${u.id === value ? "text-primary" : "text-foreground"}`}>
                            {u.name}
                          </span>
                          {u.id === currentUserId && (
                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Me</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block">{u.email}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
