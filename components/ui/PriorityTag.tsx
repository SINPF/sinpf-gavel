import { IconFlag3Filled } from "@tabler/icons-react";

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// Priority maps to semantic families:
//   CRITICAL / HIGH → destructive / warning (litigation risk vibe)
//   MEDIUM         → warning-tinted (approaching deadline)
//   LOW            → muted
// Gold (highlight) is reserved for "action required"/"due soon" — not priority level.
const config: Record<Priority, { className: string }> = {
  CRITICAL: { className: "bg-destructive/10 text-destructive" },
  HIGH:     { className: "bg-warning/10 text-warning" },
  MEDIUM:   { className: "bg-blue-50 text-blue-800" },
  LOW:      { className: "bg-muted text-muted-foreground" },
};

const labels: Record<Priority, string> = {
  CRITICAL: "Critical",
  HIGH:     "High",
  MEDIUM:   "Medium",
  LOW:      "Low",
};

interface PriorityTagProps {
  priority: Priority;
  className?: string;
}

export function PriorityTag({ priority, className = "" }: PriorityTagProps) {
  const { className: cls } = config[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium ${cls} ${className}`}
    >
      <IconFlag3Filled className="w-2.5 h-2.5" />
      {labels[priority]}
    </span>
  );
}
