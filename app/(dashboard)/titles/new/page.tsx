import { currentUser, can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import NewTitleClient from "./new-title-client";

export default async function NewTitlePage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "create_title")) redirect("/titles");
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
        Register a new title
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The title number is the primary identifier and must be unique across
        the register.
      </p>
      <div className="mt-6">
        <NewTitleClient />
      </div>
    </div>
  );
}
