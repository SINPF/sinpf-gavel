"use client";

import Link from "next/link";
import { useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSBD(value: number): string {
  return "SBD " + value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface StatData {
  byType:  Record<string, number>;
  claim:   number;
  cases: number;
}

// ─── Card components ──────────────────────────────────────────────────────────

function PrimaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-md overflow-hidden bg-blue-50 border border-blue-200 transition-colors hover:border-primary/40"
    >
      <div className="relative p-6">
        <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums leading-none mb-3 truncate">{value}</p>
        <p className="font-serif text-lg font-semibold text-foreground">{label}</p>
      </div>
    </Link>
  );
}

function SecondaryCard({
  label,
  value,
  href,
  accent,
  badge,
}: {
  label: string;
  value: string;
  href: string;
  accent: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block bg-card border border-border rounded-md overflow-hidden transition-colors hover:border-primary/40"
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-end mb-4 min-h-4">
          <div className="flex items-center gap-2">
            {badge}
            <IconArrowRight className="w-4 h-4 text-border group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums leading-none">{value}</p>
        <p className="text-sm font-medium text-foreground mt-1.5">{label}</p>
      </div>
    </Link>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function StatsGridClient({
  personal,
  overview,
}: {
  personal: StatData;
  overview: StatData;
}) {
  const [view, setView] = useState<"personal" | "overview">("personal");
  const data     = view === "personal" ? personal : overview;
  const mineOnly = view === "personal" ? "?mine=1&" : "?";
  const baseHref = view === "personal" ? "/cases?mine=1" : "/cases";

  return (
    <div className="space-y-5">
      {/* Dashboard heading + view toggle */}
      <div className="mb-8 pb-4 border-b border-border flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-4">
          <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Case files at a glance.
          </p>
        </div>

        <div className="inline-flex items-center rounded-md bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setView("personal")}
            aria-pressed={view === "personal"}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm ${
              view === "personal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => setView("overview")}
            aria-pressed={view === "overview"}
            className={`px-3 py-1.5 text-sm font-medium rounded-sm ${
              view === "overview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
        </div>
      </div>

      {/* Primary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PrimaryCard
          label={view === "personal" ? "Assigned to me" : "Total cases"}
          value={String(data.cases)}
          href={baseHref}
        />
        <PrimaryCard
          label={view === "personal" ? "My outstanding claim" : "Total outstanding claim"}
          value={formatSBD(data.claim)}
          href={baseHref}
        />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <SecondaryCard
          label="Contributions"
          value={String(data.byType["unpaid_contribution"] ?? 0)}
          href={`/cases${mineOnly}type=unpaid_contribution`}
          accent="bg-primary"
        />
        <SecondaryCard
          label="Surcharges"
          value={String(data.byType["unpaid_surcharge"] ?? 0)}
          href={`/cases${mineOnly}type=unpaid_surcharge`}
          accent="bg-blue-400"
        />
        <SecondaryCard
          label="Wages record"
          value={String(data.byType["wages_record"] ?? 0)}
          href={`/cases${mineOnly}type=wages_record`}
          accent="bg-highlight"
        />
      </div>
    </div>
  );
}
