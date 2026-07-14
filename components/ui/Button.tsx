import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  // blue-500 → blue-600 hover → blue-700 active. No shadow — institutional.
  primary:
    "bg-primary text-primary-foreground border-transparent hover:bg-blue-600 active:bg-blue-700",
  // blue-100 bg with navy text — DESIGN-SYSTEM.md §5
  secondary:
    "bg-secondary text-secondary-foreground border-transparent hover:bg-blue-200 active:bg-blue-300",
  outline:
    "bg-transparent text-foreground border-border hover:bg-accent hover:border-primary/40",
  ghost:
    "bg-transparent text-foreground border-transparent hover:bg-accent",
  danger:
    "bg-destructive text-destructive-foreground border-transparent hover:brightness-95 active:brightness-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center font-medium rounded-md border",
        "transition-colors duration-150 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon && iconPosition === "left" && (
          <span className="shrink-0">{icon}</span>
        )
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === "right" && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
}
