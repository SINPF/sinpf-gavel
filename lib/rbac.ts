// Spec §3 permission matrix. Enforced server-side by every action.
// The matrix is data, not code: one array to edit when the spec evolves.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user, userProfile } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type Role =
  | "registry_clerk"
  | "legal_officer"
  | "mls"
  | "exec_board"
  | "external_auditor"
  | "system_admin";

export type Operation =
  | "view_referral"
  | "create_referral"
  | "correct_referral"
  | "assign_referral"
  | "change_status"
  | "request_terminal"
  | "close_referral"
  | "reopen_referral"
  | "record_action"
  | "record_payment"
  | "reverse_payment"
  | "upload_document"
  | "withdraw_document"
  | "set_risk_flag"
  | "export_case"
  | "view_reports"
  | "view_audit"
  | "bulk_import"
  | "manage_reference_data"
  // Module 2 — Contracts
  | "view_contract"
  | "create_contract"
  | "update_contract"
  | "terminate_contract"
  | "upload_contract_document"
  | "withdraw_contract_document"
  // Module 3 — Insurance Register
  | "view_insurance_policy"
  | "create_insurance_policy"
  | "update_insurance_policy"
  | "upload_insurance_document"
  | "withdraw_insurance_document";

// Cell values: true = allowed, "own" = allowed only for own cases (BR-M1-06),
// "request" = may only request via pending_decision. Undefined = refused.
type Cell = true | "own" | "request";

// Matches the spec §3 table exactly. Keeping it as a plain object makes
// diffs against the source document trivial.
const MATRIX: Record<Operation, Partial<Record<Role, Cell>>> = {
  view_referral: {
    registry_clerk: true, legal_officer: true, mls: true,
    external_auditor: true, system_admin: true,
  },
  create_referral: {
    registry_clerk: true, legal_officer: true, mls: true,
  },
  correct_referral: {
    legal_officer: "own", mls: true,
  },
  assign_referral: {
    mls: true,
  },
  change_status: {
    legal_officer: "own", mls: true,
  },
  request_terminal: {
    legal_officer: "request",
  },
  close_referral: {
    mls: true,
  },
  reopen_referral: {
    mls: true,
  },
  record_action: {
    legal_officer: "own", mls: true,
  },
  record_payment: {
    registry_clerk: true, legal_officer: "own", mls: true,
  },
  reverse_payment: {
    mls: true,
  },
  upload_document: {
    registry_clerk: true, legal_officer: true, mls: true,
  },
  withdraw_document: {
    mls: true,
  },
  set_risk_flag: {
    legal_officer: "own", mls: true,
  },
  export_case: {
    legal_officer: true, mls: true, external_auditor: true,
  },
  view_reports: {
    legal_officer: "own", mls: true, exec_board: true, external_auditor: true,
  },
  view_audit: {
    mls: true, external_auditor: true, system_admin: true,
  },
  bulk_import: {
    mls: true, system_admin: true,
  },
  manage_reference_data: {
    system_admin: true,
  },
  // Module 2 — Contracts. §7 is silent on RBAC; mirroring §3's shape:
  // Registry Clerk can view + create + upload. Legal Officers can update.
  // Only MLS may terminate a contract (a significant legal decision) or
  // withdraw a stored document.
  view_contract: {
    registry_clerk: true, legal_officer: true, mls: true,
    external_auditor: true, system_admin: true,
  },
  create_contract: {
    registry_clerk: true, legal_officer: true, mls: true,
  },
  update_contract: {
    legal_officer: true, mls: true,
  },
  terminate_contract: {
    mls: true,
  },
  upload_contract_document: {
    registry_clerk: true, legal_officer: true, mls: true,
  },
  withdraw_contract_document: {
    mls: true,
  },
  // Module 3 — Insurance. §8 is silent on RBAC; mirroring the contract shape.
  // Insurance has no termination lifecycle (BR-M3-01), so no equivalent op.
  view_insurance_policy: {
    registry_clerk: true, legal_officer: true, mls: true,
    external_auditor: true, system_admin: true,
  },
  create_insurance_policy: {
    registry_clerk: true, legal_officer: true, mls: true,
  },
  update_insurance_policy: {
    legal_officer: true, mls: true,
  },
  upload_insurance_document: {
    registry_clerk: true, legal_officer: true, mls: true,
  },
  withdraw_insurance_document: {
    mls: true,
  },
};

export type CurrentUser = {
  id: string;
  role: Role;
  isActive: boolean;
};

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) return null;
  const profile = await getOrCreateProfile(session.user.id);
  return { id: session.user.id, role: profile.role, isActive: profile.isActive };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) throw new Error("Not authenticated");
  if (!u.isActive) throw new Error("Your account has been deactivated");
  return u;
}

// Upserts a default profile row so new SSO sign-ins Just Work as Legal Officers.
// The Sys Admin bumps roles from the admin surface (increment 5+).
export async function getOrCreateProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));
  if (existing) return existing;
  const [inserted] = await db
    .insert(userProfile)
    .values({ userId, role: "legal_officer", isActive: true })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  // Race: another request inserted between our select and insert. Re-read.
  const [after] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));
  return after;
}

export type PermissionContext = {
  // Ownership check for "own" scope; supply when the operation targets a
  // specific referral. Omit for general operations like create/list.
  ownedByUserId?: string | null;
};

export function can(role: Role, op: Operation, ctx: PermissionContext = {}): boolean {
  const cell = MATRIX[op]?.[role];
  if (cell === undefined) return false;
  if (cell === true) return true;
  if (cell === "request") return false; // request is not "can do the operation"
  // "own"
  return !!ctx.ownedByUserId; // caller supplies whether this user owns it.
}

// True if the role is *allowed to request* the operation (officer → terminal).
export function canRequest(role: Role, op: Operation): boolean {
  return MATRIX[op]?.[role] === "request";
}

export async function assertCan(
  op: Operation,
  ctx: PermissionContext & { user?: CurrentUser } = {},
): Promise<CurrentUser> {
  const u = ctx.user ?? (await requireUser());
  const cell = MATRIX[op]?.[u.role];
  if (cell === undefined) throw new Error(`FORBIDDEN: ${op} not permitted for role ${u.role}`);
  if (cell === "own") {
    if (!ctx.ownedByUserId || ctx.ownedByUserId !== u.id) {
      throw new Error(`FORBIDDEN: ${op} restricted to the assigned officer`);
    }
  }
  return u;
}

// Convenience: fetch all active Legal Officers for pickers.
export async function activeLegalOfficers() {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: userProfile.role,
    })
    .from(user)
    .innerJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(userProfile.isActive, true))
    .orderBy(user.name);
  // MLS may also be assigned cases, but the spec restricts assignment to
  // Legal Officers (BR-M1-05). MLS-only work is unusual; keep it strict.
  return rows.filter((r) => r.role === "legal_officer");
}
