import { type ReactNode } from "react";
import {
  IconBuilding,
  IconCalendar,
  IconUser,
  IconCurrencyDollar,
  IconHash,
} from "@tabler/icons-react";
import { Badge, type BadgeStatus } from "./Badge";
import { PriorityTag, type Priority } from "./PriorityTag";

interface MetaItemProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function MetaItem({ icon, label, value }: MetaItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
        <span className="opacity-70">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-medium text-foreground truncate tabular-nums">{value}</span>
    </div>
  );
}

interface CaseCardProps {
  caseId: string;
  title: string;
  employer: string;
  employerCode: string;
  status: BadgeStatus;
  priority: Priority;
  amount: string;
  referralDate: string;
  assignedTo?: string;
  caseTypes?: string[];
  onClick?: () => void;
  className?: string;
}

export function CaseCard({
  caseId,
  title,
  employer,
  employerCode,
  status,
  priority,
  amount,
  referralDate,
  assignedTo,
  caseTypes = [],
  onClick,
  className = "",
}: CaseCardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={[
        "w-full text-left bg-card border border-border rounded-md overflow-hidden",
        "transition-colors duration-150",
        onClick
          ? "cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          : "",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] tabular-nums">
              Case no. #{caseId.slice(0, 8).toUpperCase()}
            </span>
            {caseTypes.length > 0 && (
              <span className="text-muted-foreground/40">·</span>
            )}
            {caseTypes.map((t) => (
              <span
                key={t}
                className="text-[11px] font-medium text-muted-foreground"
              >
                {t.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground leading-snug truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PriorityTag priority={priority} />
          <Badge status={status} />
        </div>
      </div>

      {/* Metadata grid */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
        <MetaItem
          icon={<IconBuilding className="w-3 h-3" />}
          label="Employer"
          value={`${employer} (${employerCode})`}
        />
        <MetaItem
          icon={<IconCurrencyDollar className="w-3 h-3" />}
          label="Claim amount"
          value={amount}
        />
        <MetaItem
          icon={<IconCalendar className="w-3 h-3" />}
          label="Referral date"
          value={referralDate}
        />
        <MetaItem
          icon={<IconUser className="w-3 h-3" />}
          label="Assigned to"
          value={assignedTo ?? "Unassigned"}
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/40 flex items-center gap-2">
        <IconHash className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {caseId}
        </span>
        <span className="flex-1" />
        {onClick && (
          <span className="text-xs font-medium text-primary">
            View details →
          </span>
        )}
      </div>
    </Tag>
  );
}
