import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Header() {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="bg-background/95 border-b border-border px-8 py-3 flex items-center justify-end gap-4 sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">
            Welcome back
          </p>
          <p className="text-sm font-medium text-foreground leading-tight">{email}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center">
          <span className="text-secondary-foreground text-xs font-semibold">{initials}</span>
        </div>
      </div>
    </header>
  );
}
