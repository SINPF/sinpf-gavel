import { currentUser, can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import ImportClient from "./import-client";

export default async function ImportPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "bulk_import")) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Bulk import
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to import referrals. Only MLS and System Admin
          may perform bulk imports.
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Bulk import referrals
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a spreadsheet to load existing referrals. Import is all-or-nothing —
          if any row fails validation, nothing is written.
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
