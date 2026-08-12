import { db } from "@/db";
import {
  legalOpinions,
  legalOpinionAttachments,
  user,
} from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { currentUser, can } from "@/lib/rbac";
import LegalOpinionsClient from "./legal-opinions-client";

export default async function LegalOpinionsPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "view_legal_opinion")) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Legal opinions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view the legal opinions registry.
        </p>
      </div>
    );
  }

  const signedCountSub = db
    .select({
      legalOpinionId: legalOpinionAttachments.legalOpinionId,
      signedCount: sql<number>`COUNT(*) FILTER (WHERE ${legalOpinionAttachments.documentType} = 'signed_opinion' AND ${legalOpinionAttachments.isWithdrawn} = false)`.as(
        "signed_count",
      ),
    })
    .from(legalOpinionAttachments)
    .groupBy(legalOpinionAttachments.legalOpinionId)
    .as("signed_sub");

  // Self-join to detect whether a finalised, non-deleted successor points at
  // this opinion via supersedes_opinion_id (AC-M4-004.2).
  const successor = alias(legalOpinions, "successor");
  const supersededSub = db
    .select({
      supersedesOpinionId: successor.supersedesOpinionId,
      supersededCount: sql<number>`COUNT(*)`.as("superseded_count"),
      supersededById: sql<string>`MAX(${successor.id})`.as("superseded_by_id"),
      supersededByRef: sql<string>`MAX(${successor.opinionRef})`.as("superseded_by_ref"),
    })
    .from(successor)
    .where(and(eq(successor.state, "finalised"), eq(successor.isDeleted, false)))
    .groupBy(successor.supersedesOpinionId)
    .as("superseded_sub");

  const rows = await db
    .select({
      id: legalOpinions.id,
      opinionRef: legalOpinions.opinionRef,
      subjectMatter: legalOpinions.subjectMatter,
      requestingDepartment: legalOpinions.requestingDepartment,
      opinionDate: legalOpinions.opinionDate,
      state: legalOpinions.state,
      keywords: legalOpinions.keywords,
      supersedesOpinionId: legalOpinions.supersedesOpinionId,
      authorId: legalOpinions.authorId,
      authorName: user.name,
      signedCount: signedCountSub.signedCount,
      supersededById: supersededSub.supersededById,
      supersededByRef: supersededSub.supersededByRef,
    })
    .from(legalOpinions)
    .leftJoin(user, eq(user.id, legalOpinions.authorId))
    .leftJoin(signedCountSub, eq(signedCountSub.legalOpinionId, legalOpinions.id))
    .leftJoin(
      supersededSub,
      eq(supersededSub.supersedesOpinionId, legalOpinions.id),
    )
    .where(eq(legalOpinions.isDeleted, false))
    .orderBy(desc(legalOpinions.opinionDate), desc(legalOpinions.createdAt));

  const canCreate = can(me.role, "create_legal_opinion");

  return (
    <LegalOpinionsClient
      opinions={rows.map((r) => ({
        ...r,
        signedCount: Number(r.signedCount ?? 0),
        supersededById: r.supersededById ?? null,
        supersededByRef: r.supersededByRef ?? null,
      }))}
      canCreate={canCreate}
    />
  );
}
