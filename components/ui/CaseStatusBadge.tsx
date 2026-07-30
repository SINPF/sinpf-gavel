// Domain-specific badge on top of the design system tokens.
// See DESIGN-SYSTEM.md §5 (Badge conventions).

import type { HTMLAttributes } from "react";

export type CaseStatus =
  | "open"
  | "actionRequired"
  | "dueSoon"
  | "overdue"
  | "resolved"
  | "closed";

const variantClasses: Record<CaseStatus, string> = {
  open:           "bg-secondary text-secondary-foreground",
  actionRequired: "bg-highlight-muted text-highlight-foreground",
  dueSoon:        "bg-highlight-muted text-highlight-foreground ring-1 ring-highlight",
  overdue:        "bg-destructive/10 text-destructive",
  resolved:       "bg-success/10 text-success",
  closed:         "bg-muted text-muted-foreground",
};

const LABELS: Record<CaseStatus, string> = {
  open: "Open",
  actionRequired: "Action required",
  dueSoon: "Due soon",
  overdue: "Overdue",
  resolved: "Resolved",
  closed: "Closed",
};

interface CaseStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: CaseStatus;
}

export function CaseStatusBadge({
  status = "open",
  className = "",
  children,
  ...props
}: CaseStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium tabular-nums ${variantClasses[status]} ${className}`}
      {...props}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {children ?? LABELS[status]}
    </span>
  );
}
