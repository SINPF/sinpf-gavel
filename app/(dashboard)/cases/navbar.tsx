import { Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { caseReferrals } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export default async function NavBar() {
  const [{ total }]  = await db.select({ total: count() }).from(caseReferrals);
  const [{ closed }] = await db.select({ closed: count() }).from(caseReferrals).where(eq(caseReferrals.status, "closed"));
  const active = total - closed;

  return (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">Matters</h2>
          <span className="px-2 py-0.5 rounded-sm bg-secondary text-secondary-foreground text-xs font-medium tabular-nums">
            {total} total
          </span>
          <span className="px-2 py-0.5 rounded-sm bg-success/10 text-success text-xs font-medium tabular-nums">
            {active} active
          </span>
          <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground text-xs font-medium tabular-nums">
            {closed} closed
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cases/create-new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New matter
          </Link>
        </div>
      </div>
    </div>
  );
}
