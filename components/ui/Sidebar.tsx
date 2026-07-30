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
      className={`flex flex-col h-full w-64 shrink-0 bg-blue-800 text-sidebar-foreground border-r border-white/10 ${className}`}
    >
      {logo && (
        <div className="px-5 py-6 border-b border-white/10 text-center">
          {logo}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-8 space-y-8">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="px-6 mb-4 flex items-center gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/80 shrink-0">
                  {section.title}
                </p>
                <div className="flex-1 h-px bg-sidebar-border" />
              </div>
            )}
            <ul className="divide-y divide-white/10">
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
                        "group flex items-center gap-4 px-8 py-4 font-serif",
                        isActive
                          ? "text-white font-semibold text-sm"
                          : "text-sidebar-foreground/70 hover:text-white text-sm",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={`shrink-0 ${
                          isActive
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                        }`}
                      >
                        {item.icon}
                      </span>

                      <span className="flex-1 truncate">{item.label}</span>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-sm bg-highlight text-highlight-foreground text-[11px] font-semibold font-sans flex items-center justify-center tabular-nums">
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
        <div className="border-t border-white/10">
          {footer}
        </div>
      )}
    </aside>
  );
}
