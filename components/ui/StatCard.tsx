import { type ReactNode } from "react";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  className?: string;
}

// Overline label (Sans 11, 600, +0.06em, uppercase) per §2 typography.
// Card: 1px border, no shadow, 6px radius per §3.
export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  className = "",
}: StatCardProps) {
  const hasDelta = delta !== undefined;
  const isPositive = hasDelta && delta > 0;
  const isNeutral = hasDelta && delta === 0;

  return (
    <div
      className={`bg-card text-card-foreground border border-border rounded-md p-6 flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] leading-4 font-semibold text-muted-foreground uppercase tracking-[0.06em]">
          {label}
        </span>
        {icon && (
          <span className="p-2 bg-muted rounded-md text-muted-foreground">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
          {value}
        </span>

        {hasDelta && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-sm tabular-nums ${
              isNeutral
                ? "bg-muted text-muted-foreground"
                : isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isNeutral ? (
              <IconMinus className="w-3 h-3" />
            ) : isPositive ? (
              <IconTrendingUp className="w-3 h-3" />
            ) : (
              <IconTrendingDown className="w-3 h-3" />
            )}
            {isPositive && "+"}
            {delta}%{deltaLabel && ` ${deltaLabel}`}
          </span>
        )}
      </div>
    </div>
  );
}
