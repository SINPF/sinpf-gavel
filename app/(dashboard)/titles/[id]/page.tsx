import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  titles,
  encumbrances,
  titleAttachments,
  contracts,
  user,
} from "@/db/schema";
import { currentUser, can } from "@/lib/rbac";
import { getDownloadUrl } from "@/lib/storage";
import TitleDetailClient from "./title-detail-client";

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_title")) redirect("/titles");

  const [row] = await db
    .select()
    .from(titles)
    .where(eq(titles.id, id));
  if (!row) notFound();

  const dischargerUser = alias(user, "discharger_user");
  const encList = await db
    .select({
      id: encumbrances.id,
      titleId: encumbrances.titleId,
      encumbranceType: encumbrances.encumbranceType,
      holderName: encumbrances.holderName,
      registeredDate: encumbrances.registeredDate,
      expiryDate: encumbrances.expiryDate,
      state: encumbrances.state,
      dischargedDate: encumbrances.dischargedDate,
      dischargedBy: encumbrances.dischargedBy,
      dischargerName: dischargerUser.name,
      dischargeReason: encumbrances.dischargeReason,
      linkedContractId: encumbrances.linkedContractId,
      version: encumbrances.version,
      createdAt: encumbrances.createdAt,
    })
    .from(encumbrances)
    .leftJoin(dischargerUser, eq(dischargerUser.id, encumbrances.dischargedBy))
    .where(eq(encumbrances.titleId, id));
  // AC-M5-002.2 keeps discharged encumbrances in view. Sort active-first,
  // then newest registered_date within each group.
  const sortedEncs = [...encList].sort((a, b) => {
    if (a.state !== b.state) return a.state === "active" ? -1 : 1;
    return a.registeredDate < b.registeredDate ? 1 : -1;
  });

  const attachments = await db
    .select()
    .from(titleAttachments)
    .where(
      and(
        eq(titleAttachments.titleId, id),
        eq(titleAttachments.isWithdrawn, false),
      ),
    )
    .orderBy(asc(titleAttachments.uploadedAt));

  const documents = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      presignedUrl: await getDownloadUrl(a.fileUrl),
    })),
  );

  // FR-M5-004 — bidirectional linkage. Show contracts that point back at
  // this title through contracts.linked_title_id.
  const linkedContracts = await db
    .select({
      id: contracts.id,
      contractRef: contracts.contractRef,
      title: contracts.title,
      contractType: contracts.contractType,
      endDate: contracts.endDate,
      terminatedDate: contracts.terminatedDate,
    })
    .from(contracts)
    .where(
      and(eq(contracts.linkedTitleId, id), eq(contracts.isDeleted, false)),
    )
    .orderBy(desc(contracts.endDate));

  const permissions = {
    update: can(me.role, "update_title"),
    recordEncumbrance: can(me.role, "record_encumbrance"),
    updateEncumbrance: can(me.role, "update_encumbrance"),
    dischargeEncumbrance: can(me.role, "discharge_encumbrance"),
    upload: can(me.role, "upload_title_document"),
    withdraw: can(me.role, "withdraw_title_document"),
  };

  return (
    <TitleDetailClient
      title={row}
      encumbrancesData={sortedEncs}
      documents={documents}
      linkedContracts={linkedContracts}
      permissions={permissions}
    />
  );
}
