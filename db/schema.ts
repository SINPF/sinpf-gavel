import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  numeric,
  date,
  integer,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─── Roles (RBAC) ────────────────────────────────────────────────────────────
// Spec §3 permission matrix. `system_admin` is bootstrapped by admin promotion.

export const userRoleEnum = pgEnum("user_role", [
  "registry_clerk",
  "legal_officer",
  "mls",
  "exec_board",
  "external_auditor",
  "system_admin",
]);

export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull().default("legal_officer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Notification preferences (FR-M1-022) ────────────────────────────────────

export const notificationDigestEnum = pgEnum("notification_digest", [
  "individual",
  "daily_digest",
]);

export const userNotificationPref = pgTable("user_notification_pref", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailNewReferral: boolean("email_new_referral").notNull().default(true),
  emailDeadline: boolean("email_deadline").notNull().default(true),
  emailInactivity: boolean("email_inactivity").notNull().default(true),
  emailUnassigned: boolean("email_unassigned").notNull().default(true),
  emailMissedInstalment: boolean("email_missed_instalment").notNull().default(true),
  emailContractExpiry: boolean("email_contract_expiry").notNull().default(true),
  digestMode: notificationDigestEnum("digest_mode").notNull().default("individual"),
});

// ─── Spec enumerations (§6) ──────────────────────────────────────────────────

export const caseTypeEnum = pgEnum("case_type", [
  "unpaid_contribution",
  "unpaid_surcharge",
  "wages_record",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "received",
  "under_assessment",
  "notice_served",
  "settlement",
  "court_prep",
  "in_court",
  "paid",
  "wages_received",
  "closed",
  "withdrawn",
  "not_filed",
]);

export const caseOutcomeEnum = pgEnum("case_outcome", [
  "paid_in_full",
  "settled_by_deed",
  "partially_recovered",
  "wages_records_obtained",
  "irrecoverable",
  "withdrawn",
  "not_filed",
]);

export const pendingDecisionEnum = pgEnum("pending_decision", [
  "close",
  "withdraw",
  "not_file",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "demand_letter_issued",
  "notice_served",
  "employer_meeting",
  "phone_follow_up",
  "site_visit",
  "affidavit_prepared",
  "court_appearance",
  "deed_executed",
  "other",
]);

export const riskFlagEnum = pgEnum("risk_flag", [
  "no_longer_operating",
  "statute_barred",
  "untraceable",
  "in_liquidation",
  "other",
]);

export const courtVenueEnum = pgEnum("court_venue", [
  "magistrate_court",
  "high_court",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "ems_referral_letter",
  "contribution_statement",
  "compliance_note",
  "employer_correspondence",
  "legal_notice",
  "affidavit",
  "deed_of_settlement",
  "court_document",
  "payment_evidence",
  "wages_record",
  "other",
]);

export const instalmentStateEnum = pgEnum("instalment_state", [
  "due",
  "met",
  "missed",
]);

// ─── Employers ───────────────────────────────────────────────────────────────
// Kept as a lookup so search/reporting stays reliable — see Q-05 in the spec.

export const employers = pgTable("employers", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── Referral reference sequence (BR-M1-04) ──────────────────────────────────
// Per-year counter for LSD-REF-YYYY-NNNN. Rows are inserted lazily per year.

export const referralRefSequence = pgTable("referral_ref_sequence", {
  year: integer("year").primaryKey(),
  nextNumber: integer("next_number").notNull().default(1),
});

// ─── Case referrals (§5.1) ───────────────────────────────────────────────────
// The domain entity the spec calls "Referral". App/URL terminology remains "case".

export const caseReferrals = pgTable(
  "case_referrals",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    referralRef: text("referral_ref").notNull().unique(),
    // FR-M1-021.2 — pre-system legacy reference retained on migrated rows.
    legacyRef: text("legacy_ref").unique(),

    employerId: text("employer_id")
      .notNull()
      .references(() => employers.id, { onDelete: "restrict" }),

    referralDate: date("referral_date").notNull().default(sql`CURRENT_DATE`),
    dateReceived: date("date_received").notNull().default(sql`CURRENT_DATE`),

    contributionAmount: numeric("contribution_amount", { precision: 15, scale: 2 }),
    surchargeAmount: numeric("surcharge_amount", { precision: 15, scale: 2 }),
    totalClaimed: numeric("total_claimed", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),

    wagesPeriods: text("wages_periods"),
    periodOfDefaultFrom: date("period_of_default_from"),
    periodOfDefaultTo: date("period_of_default_to"),

    assignedOfficerId: text("assigned_officer_id").references(() => user.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at"),

    status: caseStatusEnum("status").notNull().default("received"),
    statusChangedAt: timestamp("status_changed_at").notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),

    courtVenue: courtVenueEnum("court_venue"),
    courtCaseNumber: text("court_case_number"),
    dateFiled: date("date_filed"),
    nextCourtDate: date("next_court_date"),
    responseDueDate: date("response_due_date"),

    riskFlags: riskFlagEnum("risk_flags").array(),
    riskNote: text("risk_note"),

    isIntakeComplete: boolean("is_intake_complete").notNull().default(false),

    outcome: caseOutcomeEnum("outcome"),
    closureReason: text("closure_reason"),
    closedAt: date("closed_at"),
    pendingDecision: pendingDecisionEnum("pending_decision"),
    pendingDecisionBy: text("pending_decision_by").references(() => user.id, {
      onDelete: "set null",
    }),
    pendingDecisionReason: text("pending_decision_reason"),
    pendingDecisionAt: timestamp("pending_decision_at"),

    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("ix_referral_employer").on(t.employerId),
    index("ix_referral_status").on(t.status),
    index("ix_referral_assigned").on(t.assignedOfficerId),
    index("ix_referral_court_case_number").on(t.courtCaseNumber),
    index("ix_referral_referral_date").on(t.referralDate),
    index("ix_referral_closed_at").on(t.closedAt),
    index("ix_referral_last_activity").on(t.lastActivityAt),
    index("ix_referral_response_due").on(t.responseDueDate),
    index("ix_referral_next_court_date").on(t.nextCourtDate),
  ],
);

// ─── Case types (many-to-many, replaces text[]) ──────────────────────────────

export const caseReferralTypes = pgTable(
  "case_referral_types",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id")
      .notNull()
      .references(() => caseReferrals.id, { onDelete: "cascade" }),
    caseType: caseTypeEnum("case_type").notNull(),
  },
  (t) => [uniqueIndex("uq_case_type").on(t.caseReferralId, t.caseType)],
);

// ─── Status history (§5.2) ───────────────────────────────────────────────────

export const referralStatusHistory = pgTable(
  "referral_status_history",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id")
      .notNull()
      .references(() => caseReferrals.id, { onDelete: "cascade" }),
    fromStatus: caseStatusEnum("from_status"),
    toStatus: caseStatusEnum("to_status").notNull(),
    reason: text("reason"),
    changedBy: text("changed_by").references(() => user.id, { onDelete: "set null" }),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
    approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index("ix_status_history_referral").on(t.caseReferralId)],
);

// ─── Actions (§5.3) ──────────────────────────────────────────────────────────

export const referralAction = pgTable(
  "referral_action",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id")
      .notNull()
      .references(() => caseReferrals.id, { onDelete: "cascade" }),
    actionType: actionTypeEnum("action_type").notNull(),
    actionDate: date("action_date").notNull(),
    notes: text("notes").notNull(),
    performedBy: text("performed_by").references(() => user.id, { onDelete: "set null" }),
    documentId: text("document_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ix_action_referral").on(t.caseReferralId)],
);

// ─── Payments (§5.4) ─────────────────────────────────────────────────────────

export const casePayments = pgTable(
  "case_payments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id")
      .notNull()
      .references(() => caseReferrals.id, { onDelete: "cascade" }),
    paymentDate: date("payment_date").notNull(),
    amountContribution: numeric("amount_contribution", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    amountSurcharge: numeric("amount_surcharge", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    receiptReference: text("receipt_reference"),
    scheduleId: text("schedule_id"),
    isReversed: boolean("is_reversed").notNull().default(false),
    reversalReason: text("reversal_reason"),
    reversedBy: text("reversed_by").references(() => user.id, { onDelete: "set null" }),
    reversedAt: timestamp("reversed_at"),
    notes: text("notes"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ix_payment_referral").on(t.caseReferralId),
    index("ix_payment_date").on(t.paymentDate),
  ],
);

// ─── Settlement schedule (§5.5) ──────────────────────────────────────────────

export const settlementSchedule = pgTable(
  "settlement_schedule",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id")
      .notNull()
      .references(() => caseReferrals.id, { onDelete: "cascade" }),
    instalmentNo: integer("instalment_no").notNull(),
    dueDate: date("due_date").notNull(),
    amountDue: numeric("amount_due", { precision: 15, scale: 2 }).notNull(),
    state: instalmentStateEnum("state").notNull().default("due"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_schedule_instalment").on(t.caseReferralId, t.instalmentNo),
    index("ix_schedule_due_date").on(t.dueDate),
  ],
);

// ─── Attachments / documents (spec: DocumentLink) ────────────────────────────

export const caseAttachments = pgTable(
  "case_attachments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id")
      .notNull()
      .references(() => caseReferrals.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    documentType: documentTypeEnum("document_type").notNull().default("other"),
    isWithdrawn: boolean("is_withdrawn").notNull().default(false),
    withdrawnBy: text("withdrawn_by").references(() => user.id, { onDelete: "set null" }),
    withdrawnAt: timestamp("withdrawn_at"),
    withdrawalReason: text("withdrawal_reason"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  },
  (t) => [index("ix_attachment_referral").on(t.caseReferralId)],
);

// ─── Contracts Register (Module 2) ───────────────────────────────────────────
// Spec §7. Status is DERIVED (BR-M2-01) — never stored. Currency defaults to
// SBD; foreign-currency contracts are permitted per Q-13.

export const contractTypeEnum = pgEnum("contract_type", [
  "lease",
  "service_agreement",
  "mou",
  "supply",
  "consultancy",
  "other",
]);

export const currencyEnum = pgEnum("currency", ["sbd", "usd", "aud", "nzd", "eur", "other"]);

export const contractDocumentTypeEnum = pgEnum("contract_document_type", [
  "signed_contract",
  "draft_contract",
  "variation_addendum",
  "termination_notice",
  "other",
]);

export const contractRefSequence = pgTable("contract_ref_sequence", {
  year: integer("year").primaryKey(),
  nextNumber: integer("next_number").notNull().default(1),
});

export const contracts = pgTable(
  "contracts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    contractRef: text("contract_ref").notNull().unique(),

    title: text("title").notNull(),
    // Parties as a Postgres array — separately searchable per Q-12 (multiple
    // parties permitted; the list is not a single free-text line).
    parties: text("parties").array().notNull(),
    contractType: contractTypeEnum("contract_type").notNull(),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),

    contractValue: numeric("contract_value", { precision: 15, scale: 2 }).notNull().default("0"),
    currency: currencyEnum("currency").notNull().default("sbd"),

    // Status is derived on read (BR-M2-01). The two termination fields drive it.
    terminatedDate: date("terminated_date"),
    terminationReason: text("termination_reason"),
    terminatedBy: text("terminated_by").references(() => user.id, { onDelete: "set null" }),

    owningDepartment: text("owning_department"),
    // Nullable FK to a future Module 5 title. No constraint until Module 5 arrives.
    linkedTitleId: text("linked_title_id"),

    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("ix_contract_title").on(t.title),
    index("ix_contract_type").on(t.contractType),
    index("ix_contract_end_date").on(t.endDate),
    index("ix_contract_parties").using("gin", t.parties),
    index("ix_contract_linked_title").on(t.linkedTitleId),
  ],
);

export const contractAttachments = pgTable(
  "contract_attachments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    documentType: contractDocumentTypeEnum("document_type").notNull().default("other"),
    isWithdrawn: boolean("is_withdrawn").notNull().default(false),
    withdrawnBy: text("withdrawn_by").references(() => user.id, { onDelete: "set null" }),
    withdrawnAt: timestamp("withdrawn_at"),
    withdrawalReason: text("withdrawal_reason"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  },
  (t) => [index("ix_contract_attachment_contract").on(t.contractId)],
);

// ─── Alerts (§13) ────────────────────────────────────────────────────────────
// Alerts are lightly polymorphic: exactly one of caseReferralId / contractId
// is set, discriminated by alertType.

export const alertTypeEnum = pgEnum("alert_type", [
  "new_referral",
  "deadline_lead",
  "deadline_overdue",
  "inactivity",
  "unassigned",
  "missed_instalment",
  "contract_expiry",
]);

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id").references(() => caseReferrals.id, {
      onDelete: "cascade",
    }),
    contractId: text("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    alertType: alertTypeEnum("alert_type").notNull(),
    // idempotency key: same run for the same target+context does not duplicate
    dedupeKey: text("dedupe_key").notNull(),
    recipientId: text("recipient_id").references(() => user.id, { onDelete: "cascade" }),
    payload: text("payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
    emailedAt: timestamp("emailed_at"),
  },
  (t) => [
    uniqueIndex("uq_alert_dedupe").on(
      t.caseReferralId,
      t.contractId,
      t.recipientId,
      t.dedupeKey,
    ),
    index("ix_alert_recipient").on(t.recipientId),
  ],
);

export const alertJobRun = pgTable("alert_job_run", {
  id: serial("id").primaryKey(),
  ranAt: timestamp("ran_at").notNull().defaultNow(),
  forDate: date("for_date").notNull(),
  success: boolean("success").notNull().default(true),
  notes: text("notes"),
});

// ─── Audit trail (CC-AUD-01) ─────────────────────────────────────────────────
// Field-level edits and other significant events, keyed by entity type + id.

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    field: text("field"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    reason: text("reason"),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ix_audit_entity").on(t.entity, t.entityId)],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(userProfile, { fields: [user.id], references: [userProfile.userId] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const employerRelations = relations(employers, ({ many }) => ({
  cases: many(caseReferrals),
}));

export const contractRelations = relations(contracts, ({ many, one }) => ({
  attachments: many(contractAttachments),
  creator: one(user, { fields: [contracts.createdBy], references: [user.id] }),
}));

export const contractAttachmentRelations = relations(contractAttachments, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractAttachments.contractId],
    references: [contracts.id],
  }),
  uploader: one(user, { fields: [contractAttachments.uploadedBy], references: [user.id] }),
}));

export const caseReferralRelations = relations(caseReferrals, ({ one, many }) => ({
  employer: one(employers, { fields: [caseReferrals.employerId], references: [employers.id] }),
  assignee: one(user, { fields: [caseReferrals.assignedOfficerId], references: [user.id] }),
  types: many(caseReferralTypes),
  attachments: many(caseAttachments),
  actions: many(referralAction),
  statusHistory: many(referralStatusHistory),
  payments: many(casePayments),
  schedule: many(settlementSchedule),
}));

export const referralActionRelations = relations(referralAction, ({ one }) => ({
  case: one(caseReferrals, {
    fields: [referralAction.caseReferralId],
    references: [caseReferrals.id],
  }),
  performer: one(user, { fields: [referralAction.performedBy], references: [user.id] }),
}));

export const referralStatusHistoryRelations = relations(
  referralStatusHistory,
  ({ one }) => ({
    case: one(caseReferrals, {
      fields: [referralStatusHistory.caseReferralId],
      references: [caseReferrals.id],
    }),
    changer: one(user, {
      fields: [referralStatusHistory.changedBy],
      references: [user.id],
    }),
  }),
);

export const casePaymentRelations = relations(casePayments, ({ one }) => ({
  case: one(caseReferrals, {
    fields: [casePayments.caseReferralId],
    references: [caseReferrals.id],
  }),
  recordedBy: one(user, { fields: [casePayments.recordedBy], references: [user.id] }),
}));

export const settlementScheduleRelations = relations(settlementSchedule, ({ one }) => ({
  case: one(caseReferrals, {
    fields: [settlementSchedule.caseReferralId],
    references: [caseReferrals.id],
  }),
}));

export const caseAttachmentRelations = relations(caseAttachments, ({ one }) => ({
  case: one(caseReferrals, {
    fields: [caseAttachments.caseReferralId],
    references: [caseReferrals.id],
  }),
  uploader: one(user, { fields: [caseAttachments.uploadedBy], references: [user.id] }),
}));
