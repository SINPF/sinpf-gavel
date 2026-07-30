"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconLogout } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";

export default function Header() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  };

  const name  = session?.user.name  ?? "";
  const email = session?.user.email ?? "";
  const firstName = name.split(/\s+/)[0] || email.split("@")[0];
  const initials = name
    ? name.split(/\s+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <header className="bg-background/95 border-b border-border px-8 py-3 flex items-center justify-end gap-4 sticky top-0 z-40 backdrop-blur-md">
      <p className="text-sm hidden sm:flex items-baseline gap-1.5">
        <span className="text-muted-foreground">Welcome back,</span>
        <span className="font-serif font-semibold text-foreground text-sm leading-none">{firstName}</span>
      </p>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Open user menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center
            hover:border-primary/40
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            transition-colors"
        >
          <span className="text-secondary-foreground text-xs font-semibold">{initials}</span>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 min-w-44 rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden z-50"
          >
            {(name || email) && (
              <div className="px-3 py-2.5 border-b border-border">
                {name && <p className="text-sm font-medium text-foreground truncate">{name}</p>}
                {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <IconLogout className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
