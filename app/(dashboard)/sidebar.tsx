import Image from "next/image";
import { IconLayoutDashboardFilled, IconBriefcaseFilled, IconBuildings } from "@tabler/icons-react";
import { Sidebar } from "@/components/ui/Sidebar";

const NAV_SECTIONS = [
  {
    items: [
      { label: "Dashboard", href: "/", icon: <IconLayoutDashboardFilled className="w-4 h-4" /> },
      { label: "Cases",     href: "/cases",     icon: <IconBriefcaseFilled className="w-4 h-4" /> },
      { label: "Employers", href: "/employers", icon: <IconBuildings className="w-4 h-4" strokeWidth={2} /> },
    ],
  },
];

export default function AppSidebar() {
  // ── Brand plate ─────────────────────────────────────────────────────────────
  const logo = (
    <div className="inline-flex items-center gap-3">
      <Image
        src="/sinpf-logo.png"
        alt="SINPF"
        width={28}
        height={28}
        className="shrink-0"
        priority
      />
      <p className="font-serif text-white font-semibold text-lg tracking-tight leading-none">
        Gavel
      </p>
    </div>
  );

  return <Sidebar sections={NAV_SECTIONS} logo={logo} className="sticky top-0 h-screen" />;
}
