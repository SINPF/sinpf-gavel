import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-8",
};

// Elevation: borders first, shadows second (DESIGN-SYSTEM.md §3).
// Cards get a 1px border and no shadow.
export function Card({
  children,
  header,
  footer,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`bg-card text-card-foreground border border-border rounded-md overflow-hidden ${className}`}
    >
      {header && (
        <div className="px-6 py-4 border-b border-border bg-muted/40">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          {footer}
        </div>
      )}
    </div>
  );
}
