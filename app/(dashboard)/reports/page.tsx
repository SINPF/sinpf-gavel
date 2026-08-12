import { currentUser } from "@/lib/rbac";
import { redirect } from "next/navigation";
import ReportsClient from "./reports-client";
import { REPORTS } from "@/lib/reports";

export default async function ReportsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Point-in-time figures per spec §14 — governing dates per report.
        </p>
      </div>
      <ReportsClient reports={REPORTS as unknown as { id: string; label: string }[]} />
    </div>
  );
}
