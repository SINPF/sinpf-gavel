import { and, eq, sql } from "drizzle-orm";
import { currentUser, can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { legalOpinions, user, userProfile } from "@/db/schema";
import NewLegalOpinionClient from "./new-legal-opinion-client";

export default async function NewLegalOpinionPage({
  searchParams,
}: {
  searchParams: Promise<{ supersedes?: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!can(me.role, "create_legal_opinion")) redirect("/legal-opinions");

  const { supersedes } = await searchParams;

  // Candidate authors: any active legal officer or MLS user. The spec says
  // author defaults to creating user but may be changed while draft — we
  // widen the picker to include MLS too because MLS also authors opinions.
  const authors = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .innerJoin(userProfile, eq(userProfile.userId, user.id))
    .where(
      and(
        eq(userProfile.isActive, true),
        sql`${userProfile.role} IN ('legal_officer', 'mls')`,
      ),
    )
    .orderBy(user.name);

  // Distinct department values already in the register — helps the datalist.
  const deptRows = await db
    .selectDistinct({ dept: legalOpinions.requestingDepartment })
    .from(legalOpinions)
    .where(eq(legalOpinions.isDeleted, false));
  const departments = deptRows.map((r) => r.dept).filter(Boolean);

  let parent:
    | {
        id: string;
        opinionRef: string;
        subjectMatter: string;
        requestingDepartment: string;
        summary: string | null;
        keywords: string[];
        authorId: string;
      }
    | null = null;
  if (supersedes) {
    const [p] = await db
      .select({
        id: legalOpinions.id,
        opinionRef: legalOpinions.opinionRef,
        subjectMatter: legalOpinions.subjectMatter,
        requestingDepartment: legalOpinions.requestingDepartment,
        summary: legalOpinions.summary,
        keywords: legalOpinions.keywords,
        authorId: legalOpinions.authorId,
        state: legalOpinions.state,
      })
      .from(legalOpinions)
      .where(eq(legalOpinions.id, supersedes));
    if (p && p.state === "finalised") {
      parent = {
        id: p.id,
        opinionRef: p.opinionRef,
        subjectMatter: p.subjectMatter,
        requestingDepartment: p.requestingDepartment,
        summary: p.summary,
        keywords: p.keywords,
        authorId: p.authorId,
      };
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
        {parent ? "Correct opinion — new record" : "Record a new legal opinion"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {parent ? (
          <>
            Superseding{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {parent.opinionRef}
            </span>
            . The original remains retrievable and marked as superseded once
            this record is finalised.
          </>
        ) : (
          <>The reference (LSD-OPN-YYYY-NNNN) is allocated on save.</>
        )}
      </p>
      <div className="mt-6">
        <NewLegalOpinionClient
          me={{ id: me.id }}
          authors={authors}
          departments={departments}
          parent={parent}
        />
      </div>
    </div>
  );
}
