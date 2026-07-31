// Aligned with DESIGN-SYSTEM.md §5:
//   Open (blue-100/navy) · In review (gold-100/gold-900) ·
//   Urgent (red tint) · Resolved (green tint) · Closed (muted)
// Domain statuses map onto these five semantic families.

export type BadgeStatus =
  | "filed" | "active" | "pending" | "hearing" | "closed" | "appeal"
  | "registered" | "in_progress" | "resolved"
  | "assessment" | "demand_issued" | "negotiation" | "prosecution";

type Family = "open" | "inReview" | "urgent" | "resolved" | "closed";

const family: Record<BadgeStatus, Family> = {
  registered:    "open",
  filed:         "open",
  active:        "open",
  assessment:    "open",
  pending:       "inReview",
  demand_issued: "inReview",
  negotiation:   "inReview",
  hearing:       "inReview",
  in_progress:   "inReview",
  prosecution:   "urgent",
  appeal:        "urgent",
  resolved:      "resolved",
  closed:        "closed",
};

const familyClasses: Record<Family, string> = {
  open:     "bg-secondary text-secondary-foreground",
  inReview: "bg-highlight-muted text-highlight-foreground",
  urgent:   "bg-destructive/10 text-destructive",
  resolved: "bg-success/10 text-success",
  closed:   "bg-muted text-muted-foreground",
};

// Solid variant — full-color fill matching the filter dropdown dot colors.
const solidFamilyClasses: Record<Family, string> = {
  open:     "bg-primary text-white",
  inReview: "bg-highlight text-highlight-foreground",
  urgent:   "bg-destructive text-white",
  resolved: "bg-success text-white",
  closed:   "bg-muted-foreground text-background",
};

const dotClasses: Record<Family, string> = {
  open:     "bg-primary",
  inReview: "bg-highlight",
  urgent:   "bg-destructive",
  resolved: "bg-success",
  closed:   "bg-muted-foreground/60",
};

const labels: Record<BadgeStatus, string> = {
  registered:    "Referral Registered",
  filed:         "Filed",
  active:        "Active",
  assessment:    "Under Assessment",
  pending:       "Pending",
  demand_issued: "Demand issued",
  negotiation:   "Negotiation",
  hearing:       "Hearing",
  in_progress:   "In progress",
  prosecution:   "Prosecution",
  appeal:        "Appeal",
  resolved:      "Resolved",
  closed:        "Closed",
};

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
  solid?: boolean;
}

export function Badge({ status, className = "", solid = false }: BadgeProps) {
  const fam     = family[status] ?? "closed";
  const bgText  = solid ? solidFamilyClasses[fam] : familyClasses[fam];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold ${bgText} ${className}`}
    >
      {!solid && <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dotClasses[fam]}`} />}
      {labels[status] ?? status}
    </span>
  );
}
