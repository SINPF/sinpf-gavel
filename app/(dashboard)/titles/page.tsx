import { db } from "@/db";
import {
  titles,
  encumbrances,
  titleAttachments,
  contracts,
} from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { currentUser, can } from "@/lib/rbac";
import TitlesClient from "./titles-client";

export default async function TitlesPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_title")) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Titles
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view the title register.
        </p>
      </div>
    );
  }

  const activeEncSub = db
    .select({
      titleId: encumbrances.titleId,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${encumbrances.state} = 'active')`.as(
        "active_count",
      ),
    })
    .from(encumbrances)
    .groupBy(encumbrances.titleId)
    .as("active_enc_sub");

  const docCountSub = db
    .select({
      titleId: titleAttachments.titleId,
      docCount: sql<number>`COUNT(*) FILTER (WHERE ${titleAttachments.isWithdrawn} = false)`.as(
        "doc_count",
      ),
    })
    .from(titleAttachments)
    .groupBy(titleAttachments.titleId)
    .as("doc_count_sub");

  const linkedContractSub = db
    .select({
      titleId: contracts.linkedTitleId,
      contractCount: sql<number>`COUNT(*)`.as("contract_count"),
    })
    .from(contracts)
    .where(eq(contracts.isDeleted, false))
    .groupBy(contracts.linkedTitleId)
    .as("linked_contract_sub");

  const rows = await db
    .select({
      id: titles.id,
      titleNumber: titles.titleNumber,
      location: titles.location,
      ownershipType: titles.ownershipType,
      registeredOwner: titles.registeredOwner,
      termEnd: titles.termEnd,
      activeEncumbranceCount: activeEncSub.activeCount,
      documentCount: docCountSub.docCount,
      linkedContractCount: linkedContractSub.contractCount,
    })
    .from(titles)
    .leftJoin(activeEncSub, eq(activeEncSub.titleId, titles.id))
    .leftJoin(docCountSub, eq(docCountSub.titleId, titles.id))
    .leftJoin(linkedContractSub, eq(linkedContractSub.titleId, titles.id))
    .where(eq(titles.isDeleted, false))
    .orderBy(asc(titles.titleNumber));

  const canCreate = can(me.role, "create_title");

  return (
    <TitlesClient
      titlesData={rows.map((r) => ({
        ...r,
        activeEncumbranceCount: Number(r.activeEncumbranceCount ?? 0),
        documentCount: Number(r.documentCount ?? 0),
        linkedContractCount: Number(r.linkedContractCount ?? 0),
      }))}
      canCreate={canCreate}
    />
  );
}
