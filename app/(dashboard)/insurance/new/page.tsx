import { currentUser, can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import NewInsuranceClient from "./new-insurance-client";

export default async function NewInsurancePage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "create_insurance_policy")) redirect("/insurance");
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
        Register a new insurance policy
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The reference (LSD-INS-YYYY-NNNN) is allocated on save.
      </p>
      <div className="mt-6">
        <NewInsuranceClient />
      </div>
    </div>
  );
}
