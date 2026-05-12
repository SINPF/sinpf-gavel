import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, pgEnum, numeric, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  activities: many(caseActivities, { relationName: "performer" }),
  proceedings: many(caseProceedings, { relationName: "proceedingPerformer" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));


// ─── Enums ────────────────────────────────────────────────────────────────────

export const caseTypeEnum = pgEnum("case_type", [
  "unpaid_contributions",
  "unpaid_surcharges",
  "wages_record",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "registered",
  "assessment",
  "demand_issued",
  "negotiation",
  "prosecution",
  "in_progress",
  "resolved",
  "closed",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "stage_changed",
  "assessment_completed",
  "demand_letter_issued",
  "negotiation_entered",
  "negotiation_completed",
  "prosecution_filed",
  "hearing_scheduled",
  "consent_order_entered",
  "default_judgment_filed",
  "enforcement_filed",
  "case_discontinued",
  "case_closed",
  "document_added",
  "note_added",
  "payment_recorded",
  "action_undone",
]);

export const courtTypeEnum = pgEnum("court_type", [
  "high_court",
  "magistrates_court",
]);

export const proceedingTypeEnum = pgEnum("proceeding_type", [
  "trial",
  "hearing",
  "mention",
  "consent_order",
  "default_judgment",
  "enforcement",
  "discontinued",
]);

export const closureTypeEnum = pgEnum("closure_type", [
  "prosecution_completed",
  "settlement_completed",
  "other",
]);

export const closureReasonEnum = pgEnum("closure_reason", [
  "statute_barred",
  "incomplete_for_prosecution",
  "employer_complied",
  "withdrawn_by_sinpf",
  "settled_out_of_court",
  "other",
]);


// ─── Employers ────────────────────────────────────────────────────────────────

export const employers = pgTable("employers", {
  id:        text("id").primaryKey().default(sql`gen_random_uuid()`),
  name:      text("name").notNull().unique(),
  code:      text("code").notNull().unique(),
  phone:     text("phone"),
  email:     text("email"),
  address:   text("address"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const employerRelations = relations(employers, ({ many }) => ({
  cases: many(caseReferrals),
}));


// ─── Case Referrals ───────────────────────────────────────────────────────────

export const caseReferrals = pgTable("case_referrals", {
  id:                 text("id").primaryKey().default(sql`gen_random_uuid()`),

  employerId:         text("employer_id").notNull().references(() => employers.id, { onDelete: "restrict" }),
  referralDate:       date("referral_date").notNull().default(sql`CURRENT_DATE`),

  totalContributions: numeric("total_contributions", { precision: 15, scale: 2 }).notNull().default("0"),
  totalSurcharges:    numeric("total_surcharges",    { precision: 15, scale: 2 }).notNull().default("0"),
  wagesRecord:        numeric("wages_record",        { precision: 15, scale: 2 }).notNull().default("0"),
  grandTotalClaim:    numeric("grand_total_claim",   { precision: 15, scale: 2 }).notNull().default("0"),

  status:             caseStatusEnum("status").notNull().default("registered"),
  assignedTo:         text("assigned_to").references(() => user.id, { onDelete: "set null" }),

  createdAt:          timestamp("created_at").notNull().default(sql`now()`),
  updatedAt:          timestamp("updated_at").notNull().default(sql`now()`),
});

export const caseReferralRelations = relations(caseReferrals, ({ one, many }) => ({
  employer:    one(employers, { fields: [caseReferrals.employerId], references: [employers.id] }),
  assignee:    one(user, { fields: [caseReferrals.assignedTo], references: [user.id] }),
  types:       many(caseReferralTypes),
  attachments: many(caseAttachments),
  activities:  many(caseActivities),
  proceedings: many(caseProceedings),
  closure:     one(caseClosure),
}));


// ─── Case Types (many-to-many) ────────────────────────────────────────────────

export const caseReferralTypes = pgTable("case_referral_types", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseReferralId: text("case_referral_id").notNull().references(() => caseReferrals.id, { onDelete: "cascade" }),
  caseType:       caseTypeEnum("case_type").notNull(),
});


// ─── Attachments ──────────────────────────────────────────────────────────────

export const caseAttachments = pgTable("case_attachments", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseReferralId: text("case_referral_id").notNull().references(() => caseReferrals.id, { onDelete: "cascade" }),
  fileName:       text("file_name").notNull(),
  fileType:       text("file_type").notNull(),
  fileUrl:        text("file_url").notNull(),
  stage:          text("stage"),
  uploadedBy:     text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  uploadedAt:     timestamp("uploaded_at").notNull().default(sql`now()`),
});


// ─── Activity Log ─────────────────────────────────────────────────────────────

export const caseActivities = pgTable("case_activities", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseReferralId: text("case_referral_id").notNull().references(() => caseReferrals.id, { onDelete: "cascade" }),
  activityType:   activityTypeEnum("activity_type").notNull(),
  notes:          text("notes"),
  performedBy:    text("performed_by").references(() => user.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").notNull().default(sql`now()`),
});

export const caseActivityRelations = relations(caseActivities, ({ one }) => ({
  case:      one(caseReferrals, { fields: [caseActivities.caseReferralId], references: [caseReferrals.id] }),
  performer: one(user, { fields: [caseActivities.performedBy], references: [user.id], relationName: "performer" }),
}));


// ─── Court Proceedings ────────────────────────────────────────────────────────

export const caseProceedings = pgTable("case_proceedings", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseReferralId: text("case_referral_id").notNull().references(() => caseReferrals.id, { onDelete: "cascade" }),
  proceedingType: proceedingTypeEnum("proceeding_type").notNull(),
  court:          courtTypeEnum("court").notNull(),
  hearingDate:    date("hearing_date"),
  nextDate:       date("next_date"),
  outcomeNotes:   text("outcome_notes"),
  performedBy:    text("performed_by").references(() => user.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").notNull().default(sql`now()`),
});

export const caseProceedingRelations = relations(caseProceedings, ({ one }) => ({
  case:      one(caseReferrals, { fields: [caseProceedings.caseReferralId], references: [caseReferrals.id] }),
  performer: one(user, { fields: [caseProceedings.performedBy], references: [user.id], relationName: "proceedingPerformer" }),
}));


// ─── Case Closure ─────────────────────────────────────────────────────────────

export const caseClosure = pgTable("case_closure", {
  id:             text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseReferralId: text("case_referral_id").notNull().unique().references(() => caseReferrals.id, { onDelete: "cascade" }),
  closureType:    closureTypeEnum("closure_type").notNull(),
  closureReason:  closureReasonEnum("closure_reason"),
  notes:          text("notes"),
  closedBy:       text("closed_by").references(() => user.id, { onDelete: "set null" }),
  closedAt:       timestamp("closed_at").notNull().default(sql`now()`),
});

export const caseClosureRelations = relations(caseClosure, ({ one }) => ({
  case:     one(caseReferrals, { fields: [caseClosure.caseReferralId], references: [caseReferrals.id] }),
  closedBy: one(user, { fields: [caseClosure.closedBy], references: [user.id] }),
}));


// ─── Payments ─────────────────────────────────────────────────────────────────

export const casePayments = pgTable("case_payments", {
  id:                text("id").primaryKey().default(sql`gen_random_uuid()`),
  caseReferralId:    text("case_referral_id").notNull().references(() => caseReferrals.id, { onDelete: "cascade" }),
  paymentDate:       date("payment_date").notNull(),
  contributionsPaid: numeric("contributions_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  surchargesPaid:    numeric("surcharges_paid",    { precision: 15, scale: 2 }).notNull().default("0"),
  wagesPaid:         numeric("wages_paid",         { precision: 15, scale: 2 }).notNull().default("0"),
  reference:         text("reference"),
  notes:             text("notes"),
  recordedBy:        text("recorded_by").references(() => user.id, { onDelete: "set null" }),
  createdAt:         timestamp("created_at").notNull().default(sql`now()`),
});

export const casePaymentRelations = relations(casePayments, ({ one }) => ({
  case:       one(caseReferrals, { fields: [casePayments.caseReferralId], references: [caseReferrals.id] }),
  recordedBy: one(user, { fields: [casePayments.recordedBy], references: [user.id] }),
}));
