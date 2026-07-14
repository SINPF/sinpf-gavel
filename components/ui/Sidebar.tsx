"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  logo?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// DESIGN-SYSTEM.md §4:
//   Navy sidebar (--sidebar / blue-900), white-ish text,
//   active item = 3px gold left-bar + gold icon.
//   Gold is present here on purpose — it trains users that gold = "where the action is".
export function Sidebar({ sections, logo, footer, className = "" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-full w-60 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border ${className}`}
    >
      {logo && (
        <div className="px-5 py-5 border-b border-sidebar-border">
          {logo}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-6 space-y-8">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-6 mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-sidebar-foreground/50">
                {section.title}
              </p>
            )}
            <ul>
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "relative flex items-center gap-3 pl-6 pr-4 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-white font-semibold"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* 3px gold left-bar on active items — the signature marker */}
                      <span
                        aria-hidden
                        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                          isActive ? "bg-sidebar-primary" : "bg-transparent"
                        }`}
                      />

                      <span
                        className={`shrink-0 ${
                          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="flex-1 truncate">{item.label}</span>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-sm bg-highlight text-highlight-foreground text-[11px] font-semibold flex items-center justify-center tabular-nums">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && (
        <div className="border-t border-sidebar-border">
          {footer}
        </div>
      )}
    </aside>
  );
}
