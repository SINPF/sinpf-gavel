import { db } from "@/db";
import { contracts, contractAttachments } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { currentUser, can } from "@/lib/rbac";
import ContractsClient from "./contracts-client";

export default async function ContractsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_contract")) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Contracts
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view the contracts register.
        </p>
      </div>
    );
  }

  const signedCountSub = db
    .select({
      contractId: contractAttachments.contractId,
      signedCount: sql<number>`COUNT(*) FILTER (WHERE ${contractAttachments.documentType} = 'signed_contract' AND ${contractAttachments.isWithdrawn} = false)`.as(
        "signed_count",
      ),
    })
    .from(contractAttachments)
    .groupBy(contractAttachments.contractId)
    .as("signed_sub");

  const rows = await db
    .select({
      id: contracts.id,
      contractRef: contracts.contractRef,
      title: contracts.title,
      parties: contracts.parties,
      contractType: contracts.contractType,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      financialYear: contracts.financialYear,
      contractValue: contracts.contractValue,
      currency: contracts.currency,
      terminatedDate: contracts.terminatedDate,
      owningDepartment: contracts.owningDepartment,
      linkedTitleId: contracts.linkedTitleId,
      signedCount: signedCountSub.signedCount,
    })
    .from(contracts)
    .leftJoin(signedCountSub, eq(signedCountSub.contractId, contracts.id))
    .where(eq(contracts.isDeleted, false))
    .orderBy(desc(contracts.endDate), desc(contracts.createdAt));

  const canCreate = can(me.role, "create_contract");

  return (
    <ContractsClient
      contracts={rows.map((r) => ({
        ...r,
        contractValue: r.contractValue ?? "0",
        signedCount: Number(r.signedCount ?? 0),
      }))}
      canCreate={canCreate}
    />
  );
}
