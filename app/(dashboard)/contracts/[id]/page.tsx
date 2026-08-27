import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, contractAttachments, titles, user } from "@/db/schema";
import { currentUser, can } from "@/lib/rbac";
import { getDownloadUrl } from "@/lib/storage";
import ContractDetailClient from "./contract-detail-client";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_contract")) redirect("/contracts");

  // FR-M5-004 — bidirectional link. LEFT JOIN titles on linked_title_id so
  // the client can render "Linked title" as a navigable link when it matches
  // a real title, or fall back to plain text (e.g. legacy free-text values).
  const [row] = await db
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
      terminationReason: contracts.terminationReason,
      terminatedBy: contracts.terminatedBy,
      terminatedByName: user.name,
      owningDepartment: contracts.owningDepartment,
      linkedTitleId: contracts.linkedTitleId,
      linkedTitleNumber: titles.titleNumber,
      version: contracts.version,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
    })
    .from(contracts)
    .leftJoin(user, eq(user.id, contracts.terminatedBy))
    .leftJoin(titles, eq(titles.id, contracts.linkedTitleId))
    .where(eq(contracts.id, id));
  if (!row) notFound();

  const attachments = await db
    .select()
    .from(contractAttachments)
    .where(and(eq(contractAttachments.contractId, id), eq(contractAttachments.isWithdrawn, false)))
    .orderBy(asc(contractAttachments.uploadedAt));

  const documents = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      presignedUrl: await getDownloadUrl(a.fileUrl),
    })),
  );

  const permissions = {
    update: can(me.role, "update_contract"),
    terminate: can(me.role, "terminate_contract"),
    upload: can(me.role, "upload_contract_document"),
    withdraw: can(me.role, "withdraw_contract_document"),
  };

  return <ContractDetailClient contract={row} documents={documents} permissions={permissions} />;
}
