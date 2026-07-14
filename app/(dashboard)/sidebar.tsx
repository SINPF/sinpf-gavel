"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconLayoutDashboard, IconBriefcase, IconBuilding, IconLogout } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Sidebar } from "@/components/ui/Sidebar";

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/", icon: <IconLayoutDashboard className="w-4 h-4" strokeWidth={2} /> },
      { label: "Matters",   href: "/cases",     icon: <IconBriefcase className="w-4 h-4" strokeWidth={2} /> },
      { label: "Employers", href: "/employers", icon: <IconBuilding  className="w-4 h-4" strokeWidth={2} /> },
    ],
  },
];

export default function AppSidebar() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  };

  const logo = (
    <div className="flex items-center gap-3">
      <Image src="/sinpf-logo.png" alt="SINPF" width={36} height={36} className="rounded-sm" />
      <div>
        <p className="font-serif text-white font-semibold text-base tracking-tight leading-tight">Gavel</p>
        <p className="text-sidebar-foreground/50 text-[11px] font-semibold uppercase tracking-[0.06em] leading-tight mt-0.5">
          SINPF Legal
        </p>
      </div>
    </div>
  );

  const footer = (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 px-6 py-3 w-full text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-colors"
    >
      <IconLogout className="w-4 h-4 shrink-0" />
      <span>Sign out</span>
    </button>
  );

  return <Sidebar sections={NAV_SECTIONS} logo={logo} footer={footer} className="sticky top-0 h-screen" />;
}
