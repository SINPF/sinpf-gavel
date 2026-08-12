// Aligned with DESIGN-SYSTEM.md §5:
//   Open (blue-100/navy) · In review (gold-100/gold-900) ·
//   Urgent (red tint) · Resolved (green tint) · Closed (muted)
// Spec §6 statuses map onto these five semantic families.

export type BadgeStatus =
  | "received"
  | "under_assessment"
  | "notice_served"
  | "settlement"
  | "court_prep"
  | "in_court"
  | "paid"
  | "wages_received"
  | "closed"
  | "withdrawn"
  | "not_filed";

type Family = "open" | "inReview" | "urgent" | "resolved" | "closed";

const family: Record<BadgeStatus, Family> = {
  received:         "open",
  under_assessment: "open",
  notice_served:    "inReview",
  settlement:       "inReview",
  court_prep:       "urgent",
  in_court:         "urgent",
  paid:             "resolved",
  wages_received:   "resolved",
  closed:           "closed",
  withdrawn:        "closed",
  not_filed:        "closed",
};

const familyClasses: Record<Family, string> = {
  open:     "bg-secondary text-secondary-foreground",
  inReview: "bg-highlight-muted text-highlight-foreground",
  urgent:   "bg-destructive/10 text-destructive",
  resolved: "bg-success/10 text-success",
  closed:   "bg-muted text-muted-foreground",
};

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

export const STATUS_LABELS: Record<BadgeStatus, string> = {
  received:         "Received",
  under_assessment: "Under assessment",
  notice_served:    "Notice served",
  settlement:       "Settlement",
  court_prep:       "Court prep",
  in_court:         "In court",
  paid:             "Paid",
  wages_received:   "Wages received",
  closed:           "Closed",
  withdrawn:        "Withdrawn",
  not_filed:        "Not filed",
};

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
  solid?: boolean;
}

export function Badge({ status, className = "", solid = false }: BadgeProps) {
  const fam = family[status] ?? "closed";
  const bgText = solid ? solidFamilyClasses[fam] : familyClasses[fam];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold ${bgText} ${className}`}
    >
      {!solid && <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dotClasses[fam]}`} />}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
