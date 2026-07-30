"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconLayoutDashboard, IconBriefcase, IconBuilding, IconLogout } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Sidebar } from "@/components/ui/Sidebar";

const NAV_SECTIONS = [
  {
    items: [
      { label: "Dashboard", href: "/", icon: <IconLayoutDashboard className="w-4 h-4" strokeWidth={2} /> },
      { label: "Matters",   href: "/cases",     icon: <IconBriefcase className="w-4 h-4" strokeWidth={2} /> },
      { label: "Employers", href: "/employers", icon: <IconBuilding  className="w-4 h-4" strokeWidth={2} /> },
    ],
  },
];

function initialsFor(name?: string, email?: string): string {
  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export default function AppSidebar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  };

  const userName  = session?.user?.name  ?? "";
  const userEmail = session?.user?.email ?? "";
  const initials  = initialsFor(userName, userEmail);

  // ── Brand plate ─────────────────────────────────────────────────────────────
  const logo = (
    <div className="flex items-center gap-3.5">
      <div className="shrink-0 w-10 h-10 rounded-md bg-white/5 border border-white/10 p-1.5">
        <Image
          src="/sinpf-logo.png"
          alt="SINPF"
          width={28}
          height={28}
          className="w-full h-full object-contain"
        />
      </div>
      <p className="font-serif text-white font-semibold text-lg tracking-tight leading-tight truncate">
        Gavel
      </p>
    </div>
  );

  // ── User pod + sign-out ─────────────────────────────────────────────────────
  const footer = (
    <div>
      {session?.user && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="shrink-0 w-9 h-9 rounded-full bg-sidebar-primary/15 border border-sidebar-primary/40 flex items-center justify-center text-sidebar-primary text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {userName || "Signed in"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">
              {userEmail}
            </p>
          </div>
        </div>
      )}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-6 py-3 w-full text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/70 hover:text-white hover:bg-blue-900/60 transition-colors"
      >
        <IconLogout className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        Sign out
      </button>
    </div>
  );

  return <Sidebar sections={NAV_SECTIONS} logo={logo} footer={footer} className="sticky top-0 h-screen" />;
}
