import { currentUser, can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import NewContractClient from "./new-contract-client";

export default async function NewContractPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "create_contract")) redirect("/contracts");
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
        Register a new contract
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The reference (LSD-CON-YYYY-NNNN) is allocated on save.
      </p>
      <div className="mt-6">
        <NewContractClient />
      </div>
    </div>
  );
}
