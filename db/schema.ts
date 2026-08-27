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
  emailInsuranceExpiry: boolean("email_insurance_expiry").notNull().default(true),
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
  "directions",
  "consent_order",
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

    // Australian FY convention (Jul–Jun) stored as the starting calendar year:
    // 2024 ⇒ FY 2024/25. Captured explicitly so back-dated or renewal contracts
    // can be attributed to the FY they were actually made in, independent of
    // start_date.
    financialYear: integer("financial_year").notNull(),

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
    index("ix_contract_financial_year").on(t.financialYear),
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

// ─── Insurance Register (Module 3) ───────────────────────────────────────────
// Spec §8. Status is DERIVED (BR-M3-01) — never stored. Policies cover a
// person, a class of persons, or an asset. Property policies may link to a
// Module 5 title once that module lands.

export const insurancePolicyTypeEnum = pgEnum("insurance_policy_type", [
  "medical",
  "property",
]);

export const insurancePolicyDocumentTypeEnum = pgEnum("insurance_policy_document_type", [
  "policy_schedule",
  "renewal_notice",
  "claim_document",
  "other",
]);

export const insurancePolicyRefSequence = pgTable("insurance_policy_ref_sequence", {
  year: integer("year").primaryKey(),
  nextNumber: integer("next_number").notNull().default(1),
});

export const insurancePolicies = pgTable(
  "insurance_policies",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    policyRef: text("policy_ref").notNull().unique(),

    // Insurer's own policy number. AC-M3-001.3 wants a warning (not a hard
    // reject) when it duplicates for the same insurer, so no unique constraint.
    policyNumber: text("policy_number").notNull(),
    insurerName: text("insurer_name").notNull(),
    insurerContact: text("insurer_contact"),

    policyType: insurancePolicyTypeEnum("policy_type").notNull(),
    insuredSubject: text("insured_subject").notNull(),

    // Nullable text FK to a future Module 5 title. No constraint until then.
    linkedTitleId: text("linked_title_id"),

    coverageStart: date("coverage_start").notNull(),
    coverageEnd: date("coverage_end").notNull(),

    policyValue: numeric("policy_value", { precision: 15, scale: 2 }).notNull().default("0"),
    premiumAmount: numeric("premium_amount", { precision: 15, scale: 2 }),
    currency: currencyEnum("currency").notNull().default("sbd"),

    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("ix_insurance_policy_insurer").on(t.insurerName),
    index("ix_insurance_policy_type").on(t.policyType),
    index("ix_insurance_policy_coverage_end").on(t.coverageEnd),
    index("ix_insurance_policy_linked_title").on(t.linkedTitleId),
    index("ix_insurance_policy_number").on(t.insurerName, t.policyNumber),
  ],
);

export const insurancePolicyAttachments = pgTable(
  "insurance_policy_attachments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    insurancePolicyId: text("insurance_policy_id")
      .notNull()
      .references(() => insurancePolicies.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    documentType: insurancePolicyDocumentTypeEnum("document_type").notNull().default("other"),
    isWithdrawn: boolean("is_withdrawn").notNull().default(false),
    withdrawnBy: text("withdrawn_by").references(() => user.id, { onDelete: "set null" }),
    withdrawnAt: timestamp("withdrawn_at"),
    withdrawalReason: text("withdrawal_reason"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  },
  (t) => [index("ix_insurance_policy_attachment_policy").on(t.insurancePolicyId)],
);

// ─── Alerts (§13) ────────────────────────────────────────────────────────────
// Alerts are lightly polymorphic: exactly one of caseReferralId / contractId /
// insurancePolicyId is set, discriminated by alertType.

export const alertTypeEnum = pgEnum("alert_type", [
  "new_referral",
  "deadline_lead",
  "deadline_overdue",
  "inactivity",
  "unassigned",
  "missed_instalment",
  "contract_expiry",
  "insurance_expiry",
]);

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    caseReferralId: text("case_referral_id").references(() => caseReferrals.id, {
      onDelete: "cascade",
    }),
    contractId: text("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
    insurancePolicyId: text("insurance_policy_id").references(() => insurancePolicies.id, {
      onDelete: "cascade",
    }),
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
      t.insurancePolicyId,
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

// ─── Legal Opinions Registry (Module 4) ──────────────────────────────────────
// Spec §9. State is STORED (draft / finalised) because BR-M4-01 makes
// finalisation an event with an author, a timestamp, and an irreversible
// consequence. "Superseded" is not stored — it's derived from the existence
// of a finalised successor pointing at this row via supersedes_opinion_id.

export const legalOpinionStateEnum = pgEnum("legal_opinion_state", [
  "draft",
  "finalised",
]);

export const legalOpinionDocumentTypeEnum = pgEnum("legal_opinion_document_type", [
  "signed_opinion",
  "draft_opinion",
  "supporting_material",
  "other",
]);

export const legalOpinionRefSequence = pgTable("legal_opinion_ref_sequence", {
  year: integer("year").primaryKey(),
  nextNumber: integer("next_number").notNull().default(1),
});

export const legalOpinions = pgTable(
  "legal_opinions",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    opinionRef: text("opinion_ref").notNull().unique(),

    subjectMatter: text("subject_matter").notNull(),
    requestingDepartment: text("requesting_department").notNull(),

    dateRequested: date("date_requested"),
    // Required — the date the opinion was issued. Must not be in the future
    // (AC-M4-001.3); enforced at validation, not DB level.
    opinionDate: date("opinion_date").notNull(),

    // Defaults to the creating user at insert time (AC-M4-001.2). Nullable
    // FK target is the user table; column itself is NOT NULL.
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),

    summary: text("summary"),
    // Keywords for CC-SRCH-01 keyword search. GIN-indexed below.
    keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),

    state: legalOpinionStateEnum("state").notNull().default("draft"),

    // Self-reference for the correction mechanism (AC-M4-004.2). Nullable —
    // most opinions do not supersede anything. onDelete=set null keeps the
    // successor row alive even if the original is soft-deleted; is_deleted
    // is the soft-delete signal we actually rely on.
    supersedesOpinionId: text("supersedes_opinion_id"),

    finalisedAt: timestamp("finalised_at"),
    finalisedBy: text("finalised_by").references(() => user.id, { onDelete: "set null" }),

    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("ix_legal_opinion_subject").on(t.subjectMatter),
    index("ix_legal_opinion_dept").on(t.requestingDepartment),
    index("ix_legal_opinion_author").on(t.authorId),
    index("ix_legal_opinion_state").on(t.state),
    index("ix_legal_opinion_opinion_date").on(t.opinionDate),
    index("ix_legal_opinion_supersedes").on(t.supersedesOpinionId),
    index("ix_legal_opinion_keywords").using("gin", t.keywords),
  ],
);

export const legalOpinionAttachments = pgTable(
  "legal_opinion_attachments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    legalOpinionId: text("legal_opinion_id")
      .notNull()
      .references(() => legalOpinions.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    documentType: legalOpinionDocumentTypeEnum("document_type").notNull().default("other"),
    isWithdrawn: boolean("is_withdrawn").notNull().default(false),
    withdrawnBy: text("withdrawn_by").references(() => user.id, { onDelete: "set null" }),
    withdrawnAt: timestamp("withdrawn_at"),
    withdrawalReason: text("withdrawal_reason"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  },
  (t) => [index("ix_legal_opinion_attachment_opinion").on(t.legalOpinionId)],
);

// ─── Title Register (Module 5) ───────────────────────────────────────────────
// Spec §10. Titles have no LSD-XXX system reference — the user-supplied
// title_number is the primary key from the user's perspective. Encumbrances
// are a child entity because one title can carry several, each with its own
// lifecycle. Discharge is one-way (like BR-M4-01 finalisation) and requires
// both a date and a supporting document per AC-M5-002.2.

// Q-17 flagged in the SRS: these ownership types await confirmation of
// Solomon Islands land tenure conventions. Reflecting the SRS values as-is.
export const titleOwnershipTypeEnum = pgEnum("title_ownership_type", [
  "perpetual_estate",
  "fixed_term_estate",
  "leasehold_interest",
  "other",
]);

export const encumbranceTypeEnum = pgEnum("encumbrance_type", [
  "lease",
  "mortgage",
  "caveat",
  "easement",
  "other",
]);

export const encumbranceStateEnum = pgEnum("encumbrance_state", [
  "active",
  "discharged",
]);

export const titleDocumentTypeEnum = pgEnum("title_document_type", [
  "title_deed",
  "certificate_of_title",
  "survey_plan",
  "encumbrance_document",
  "discharge_document",
  "other",
]);

export const titles = pgTable(
  "titles",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    titleNumber: text("title_number").notNull().unique(),
    location: text("location").notNull(),
    ownershipType: titleOwnershipTypeEnum("ownership_type").notNull(),
    // Registered proprietor — may differ from SINPF when held via a subsidiary
    // or trustee. Nullable per SRS.
    registeredOwner: text("registered_owner"),
    // Required when ownership_type = fixed_term_estate. Enforced in validator
    // + server action rather than as a DB check.
    termStart: date("term_start"),
    termEnd: date("term_end"),
    notes: text("notes"),

    version: integer("version").notNull().default(1),
    isDeleted: boolean("is_deleted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("ix_title_number").on(t.titleNumber),
    index("ix_title_location").on(t.location),
    index("ix_title_ownership").on(t.ownershipType),
    index("ix_title_term_end").on(t.termEnd),
  ],
);

// Q-18 blocks the "linked disputes" half of FR-M5-004: no dispute record
// exists anywhere in the SRS. Skipped intentionally. Contract links are
// wired via encumbrances.linked_contract_id (bare text, matches the
// contracts.linked_title_id pattern at line 500).
export const encumbrances = pgTable(
  "encumbrances",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    titleId: text("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),
    encumbranceType: encumbranceTypeEnum("encumbrance_type").notNull(),
    holderName: text("holder_name").notNull(),
    registeredDate: date("registered_date").notNull(),
    expiryDate: date("expiry_date"),
    state: encumbranceStateEnum("state").notNull().default("active"),

    dischargedDate: date("discharged_date"),
    dischargedBy: text("discharged_by").references(() => user.id, {
      onDelete: "set null",
    }),
    dischargeReason: text("discharge_reason"),

    linkedContractId: text("linked_contract_id"),

    version: integer("version").notNull().default(1),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("ix_encumbrance_title").on(t.titleId),
    index("ix_encumbrance_state").on(t.state),
    index("ix_encumbrance_expiry").on(t.expiryDate),
    index("ix_encumbrance_linked_contract").on(t.linkedContractId),
  ],
);

// Single attachment table for the title itself and any of its encumbrances.
// encumbrance_id nullable lets a discharge_document (AC-M5-002.2) scope to a
// specific encumbrance rather than the parent title.
export const titleAttachments = pgTable(
  "title_attachments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    titleId: text("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    encumbranceId: text("encumbrance_id").references(() => encumbrances.id, {
      onDelete: "set null",
    }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    documentType: titleDocumentTypeEnum("document_type").notNull().default("other"),
    isWithdrawn: boolean("is_withdrawn").notNull().default(false),
    withdrawnBy: text("withdrawn_by").references(() => user.id, { onDelete: "set null" }),
    withdrawnAt: timestamp("withdrawn_at"),
    withdrawalReason: text("withdrawal_reason"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("ix_title_attachment_title").on(t.titleId),
    index("ix_title_attachment_encumbrance").on(t.encumbranceId),
  ],
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

export const insurancePolicyRelations = relations(insurancePolicies, ({ many, one }) => ({
  attachments: many(insurancePolicyAttachments),
  creator: one(user, { fields: [insurancePolicies.createdBy], references: [user.id] }),
}));

export const insurancePolicyAttachmentRelations = relations(
  insurancePolicyAttachments,
  ({ one }) => ({
    policy: one(insurancePolicies, {
      fields: [insurancePolicyAttachments.insurancePolicyId],
      references: [insurancePolicies.id],
    }),
    uploader: one(user, {
      fields: [insurancePolicyAttachments.uploadedBy],
      references: [user.id],
    }),
  }),
);

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

export const legalOpinionRelations = relations(legalOpinions, ({ many, one }) => ({
  attachments: many(legalOpinionAttachments),
  author: one(user, { fields: [legalOpinions.authorId], references: [user.id] }),
  supersedes: one(legalOpinions, {
    fields: [legalOpinions.supersedesOpinionId],
    references: [legalOpinions.id],
    relationName: "supersede_chain",
  }),
}));

export const legalOpinionAttachmentRelations = relations(
  legalOpinionAttachments,
  ({ one }) => ({
    opinion: one(legalOpinions, {
      fields: [legalOpinionAttachments.legalOpinionId],
      references: [legalOpinions.id],
    }),
    uploader: one(user, {
      fields: [legalOpinionAttachments.uploadedBy],
      references: [user.id],
    }),
  }),
);

export const titleRelations = relations(titles, ({ many, one }) => ({
  encumbrances: many(encumbrances),
  attachments: many(titleAttachments),
  creator: one(user, { fields: [titles.createdBy], references: [user.id] }),
}));

export const encumbranceRelations = relations(encumbrances, ({ one, many }) => ({
  title: one(titles, { fields: [encumbrances.titleId], references: [titles.id] }),
  discharger: one(user, {
    fields: [encumbrances.dischargedBy],
    references: [user.id],
  }),
  attachments: many(titleAttachments),
}));

export const titleAttachmentRelations = relations(titleAttachments, ({ one }) => ({
  title: one(titles, {
    fields: [titleAttachments.titleId],
    references: [titles.id],
  }),
  encumbrance: one(encumbrances, {
    fields: [titleAttachments.encumbranceId],
    references: [encumbrances.id],
  }),
  uploader: one(user, {
    fields: [titleAttachments.uploadedBy],
    references: [user.id],
  }),
}));
