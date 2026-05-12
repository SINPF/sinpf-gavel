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
      { label: "Cases",     href: "/cases",     icon: <IconBriefcase className="w-4 h-4" strokeWidth={2} /> },
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
      <Image src="/sinpf-logo.png" alt="SINPF" width={36} height={36} className="rounded-xl" />
      <div>
        <p className="text-white font-bold text-sm tracking-tight leading-tight">Gavel</p>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] leading-tight mt-0.5">
          SINPF Legal
        </p>
      </div>
    </div>
  );

  const footer = (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all group"
    >
      <span className="w-0.5 h-4 rounded-full bg-transparent shrink-0" />
      <IconLogout className="w-4 h-4 shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  return <Sidebar sections={NAV_SECTIONS} logo={logo} footer={footer} className="sticky top-0 h-screen" />;
}
