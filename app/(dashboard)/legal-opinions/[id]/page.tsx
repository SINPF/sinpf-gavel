import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  legalOpinions,
  legalOpinionAttachments,
  user,
} from "@/db/schema";
import { currentUser, can } from "@/lib/rbac";
import { getDownloadUrl } from "@/lib/storage";
import LegalOpinionDetailClient from "./legal-opinion-detail-client";

export default async function LegalOpinionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_legal_opinion")) redirect("/legal-opinions");

  const authorUser = alias(user, "author_user");
  const finaliserUser = alias(user, "finaliser_user");
  const [row] = await db
    .select({
      id: legalOpinions.id,
      opinionRef: legalOpinions.opinionRef,
      subjectMatter: legalOpinions.subjectMatter,
      requestingDepartment: legalOpinions.requestingDepartment,
      dateRequested: legalOpinions.dateRequested,
      opinionDate: legalOpinions.opinionDate,
      authorId: legalOpinions.authorId,
      summary: legalOpinions.summary,
      keywords: legalOpinions.keywords,
      state: legalOpinions.state,
      supersedesOpinionId: legalOpinions.supersedesOpinionId,
      finalisedAt: legalOpinions.finalisedAt,
      finalisedBy: legalOpinions.finalisedBy,
      version: legalOpinions.version,
      createdAt: legalOpinions.createdAt,
      updatedAt: legalOpinions.updatedAt,
      authorName: authorUser.name,
      finaliserName: finaliserUser.name,
    })
    .from(legalOpinions)
    .leftJoin(authorUser, eq(authorUser.id, legalOpinions.authorId))
    .leftJoin(finaliserUser, eq(finaliserUser.id, legalOpinions.finalisedBy))
    .where(eq(legalOpinions.id, id));
  if (!row) notFound();

  const attachments = await db
    .select()
    .from(legalOpinionAttachments)
    .where(
      and(
        eq(legalOpinionAttachments.legalOpinionId, id),
        eq(legalOpinionAttachments.isWithdrawn, false),
      ),
    )
    .orderBy(asc(legalOpinionAttachments.uploadedAt));

  const documents = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      presignedUrl: await getDownloadUrl(a.fileUrl),
    })),
  );

  // If this opinion supersedes another, fetch the parent's ref for a link.
  let supersedes: { id: string; opinionRef: string } | null = null;
  if (row.supersedesOpinionId) {
    const [p] = await db
      .select({ id: legalOpinions.id, opinionRef: legalOpinions.opinionRef })
      .from(legalOpinions)
      .where(eq(legalOpinions.id, row.supersedesOpinionId));
    if (p) supersedes = p;
  }

  // Detect a finalised successor (this row itself has been superseded).
  const [successor] = await db
    .select({ id: legalOpinions.id, opinionRef: legalOpinions.opinionRef })
    .from(legalOpinions)
    .where(
      and(
        eq(legalOpinions.supersedesOpinionId, id),
        eq(legalOpinions.state, "finalised"),
        eq(legalOpinions.isDeleted, false),
      ),
    )
    .limit(1);

  const permissions = {
    update: can(me.role, "update_legal_opinion", { ownedByUserId: row.authorId }),
    finalise: can(me.role, "finalise_legal_opinion", {
      ownedByUserId: row.authorId,
    }),
    upload: can(me.role, "upload_legal_opinion_document", {
      ownedByUserId: row.authorId,
    }),
    withdraw: can(me.role, "withdraw_legal_opinion_document"),
    createSuperseding: can(me.role, "create_legal_opinion"),
  };

  return (
    <LegalOpinionDetailClient
      opinion={row}
      documents={documents}
      supersedes={supersedes}
      supersededBy={successor ?? null}
      permissions={permissions}
    />
  );
}
