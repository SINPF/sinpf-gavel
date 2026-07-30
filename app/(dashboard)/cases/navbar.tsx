import { Plus } from "lucide-react";
import Link from "next/link";

export default function NavBar() {
  return (
    <div className="mb-8 pb-4 border-b border-border flex items-baseline justify-between gap-4 flex-wrap">
      <div className="flex items-baseline gap-4">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Cases
        </h1>
        <p className="text-sm text-muted-foreground">
          Track and manage case referrals.
        </p>
      </div>

      <Link
        href="/cases/create-new"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        New case referral
      </Link>
    </div>
  );
}
