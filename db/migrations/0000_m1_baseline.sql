CREATE TYPE "public"."action_type" AS ENUM('demand_letter_issued', 'notice_served', 'employer_meeting', 'phone_follow_up', 'site_visit', 'affidavit_prepared', 'court_appearance', 'deed_executed', 'other');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('new_referral', 'deadline_lead', 'deadline_overdue', 'inactivity', 'unassigned', 'missed_instalment');--> statement-breakpoint
CREATE TYPE "public"."case_outcome" AS ENUM('paid_in_full', 'settled_by_deed', 'partially_recovered', 'wages_records_obtained', 'irrecoverable', 'withdrawn', 'not_filed');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('received', 'under_assessment', 'notice_served', 'settlement', 'court_prep', 'in_court', 'paid', 'wages_received', 'closed', 'withdrawn', 'not_filed');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('unpaid_contribution', 'unpaid_surcharge', 'wages_record');--> statement-breakpoint
CREATE TYPE "public"."court_venue" AS ENUM('magistrate_court', 'high_court');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('ems_referral_letter', 'contribution_statement', 'compliance_note', 'employer_correspondence', 'legal_notice', 'affidavit', 'deed_of_settlement', 'court_document', 'payment_evidence', 'wages_record', 'other');--> statement-breakpoint
CREATE TYPE "public"."instalment_state" AS ENUM('due', 'met', 'missed');--> statement-breakpoint
CREATE TYPE "public"."notification_digest" AS ENUM('individual', 'daily_digest');--> statement-breakpoint
CREATE TYPE "public"."pending_decision" AS ENUM('close', 'withdraw', 'not_file');--> statement-breakpoint
CREATE TYPE "public"."risk_flag" AS ENUM('no_longer_operating', 'statute_barred', 'untraceable', 'in_liquidation', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('registry_clerk', 'legal_officer', 'mls', 'exec_board', 'external_auditor', 'system_admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_job_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"ran_at" timestamp DEFAULT now() NOT NULL,
	"for_date" date NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"dedupe_key" text NOT NULL,
	"recipient_id" text,
	"payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"emailed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_attachments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"document_type" "document_type" DEFAULT 'other' NOT NULL,
	"is_withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawn_by" text,
	"withdrawn_at" timestamp,
	"withdrawal_reason" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_payments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"payment_date" date NOT NULL,
	"amount_contribution" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount_surcharge" numeric(15, 2) DEFAULT '0' NOT NULL,
	"receipt_reference" text,
	"schedule_id" text,
	"is_reversed" boolean DEFAULT false NOT NULL,
	"reversal_reason" text,
	"reversed_by" text,
	"reversed_at" timestamp,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_referral_types" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"case_type" "case_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_referrals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_ref" text NOT NULL,
	"employer_id" text NOT NULL,
	"referral_date" date DEFAULT CURRENT_DATE NOT NULL,
	"date_received" date DEFAULT CURRENT_DATE NOT NULL,
	"contribution_amount" numeric(15, 2),
	"surcharge_amount" numeric(15, 2),
	"total_claimed" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wages_periods" text,
	"period_of_default_from" date,
	"period_of_default_to" date,
	"assigned_officer_id" text,
	"assigned_at" timestamp,
	"status" "case_status" DEFAULT 'received' NOT NULL,
	"status_changed_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"court_venue" "court_venue",
	"court_case_number" text,
	"date_filed" date,
	"next_court_date" date,
	"response_due_date" date,
	"risk_flags" "risk_flag"[],
	"risk_note" text,
	"is_intake_complete" boolean DEFAULT false NOT NULL,
	"outcome" "case_outcome",
	"closure_reason" text,
	"closed_at" date,
	"pending_decision" "pending_decision",
	"pending_decision_by" text,
	"pending_decision_reason" text,
	"pending_decision_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "case_referrals_referral_ref_unique" UNIQUE("referral_ref")
);
--> statement-breakpoint
CREATE TABLE "employers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employers_name_unique" UNIQUE("name"),
	CONSTRAINT "employers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_action" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"action_type" "action_type" NOT NULL,
	"action_date" date NOT NULL,
	"notes" text NOT NULL,
	"performed_by" text,
	"document_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_ref_sequence" (
	"year" integer PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_status_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"from_status" "case_status",
	"to_status" "case_status" NOT NULL,
	"reason" text,
	"changed_by" text,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settlement_schedule" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"instalment_no" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount_due" numeric(15, 2) NOT NULL,
	"state" "instalment_state" DEFAULT 'due' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_notification_pref" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_new_referral" boolean DEFAULT true NOT NULL,
	"email_deadline" boolean DEFAULT true NOT NULL,
	"email_inactivity" boolean DEFAULT true NOT NULL,
	"email_unassigned" boolean DEFAULT true NOT NULL,
	"email_missed_instalment" boolean DEFAULT true NOT NULL,
	"digest_mode" "notification_digest" DEFAULT 'individual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'legal_officer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_withdrawn_by_user_id_fk" FOREIGN KEY ("withdrawn_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_payments" ADD CONSTRAINT "case_payments_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_payments" ADD CONSTRAINT "case_payments_reversed_by_user_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_payments" ADD CONSTRAINT "case_payments_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_referral_types" ADD CONSTRAINT "case_referral_types_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_assigned_officer_id_user_id_fk" FOREIGN KEY ("assigned_officer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_pending_decision_by_user_id_fk" FOREIGN KEY ("pending_decision_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_action" ADD CONSTRAINT "referral_action_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_action" ADD CONSTRAINT "referral_action_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_schedule" ADD CONSTRAINT "settlement_schedule_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_pref" ADD CONSTRAINT "user_notification_pref_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alert_dedupe" ON "alerts" USING btree ("case_referral_id","recipient_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "ix_alert_recipient" ON "alerts" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "ix_audit_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "ix_attachment_referral" ON "case_attachments" USING btree ("case_referral_id");--> statement-breakpoint
CREATE INDEX "ix_payment_referral" ON "case_payments" USING btree ("case_referral_id");--> statement-breakpoint
CREATE INDEX "ix_payment_date" ON "case_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_case_type" ON "case_referral_types" USING btree ("case_referral_id","case_type");--> statement-breakpoint
CREATE INDEX "ix_referral_employer" ON "case_referrals" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "ix_referral_status" ON "case_referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_referral_assigned" ON "case_referrals" USING btree ("assigned_officer_id");--> statement-breakpoint
CREATE INDEX "ix_referral_court_case_number" ON "case_referrals" USING btree ("court_case_number");--> statement-breakpoint
CREATE INDEX "ix_referral_referral_date" ON "case_referrals" USING btree ("referral_date");--> statement-breakpoint
CREATE INDEX "ix_referral_closed_at" ON "case_referrals" USING btree ("closed_at");--> statement-breakpoint
CREATE INDEX "ix_referral_last_activity" ON "case_referrals" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "ix_referral_response_due" ON "case_referrals" USING btree ("response_due_date");--> statement-breakpoint
CREATE INDEX "ix_referral_next_court_date" ON "case_referrals" USING btree ("next_court_date");--> statement-breakpoint
CREATE INDEX "ix_action_referral" ON "referral_action" USING btree ("case_referral_id");--> statement-breakpoint
CREATE INDEX "ix_status_history_referral" ON "referral_status_history" USING btree ("case_referral_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_schedule_instalment" ON "settlement_schedule" USING btree ("case_referral_id","instalment_no");--> statement-breakpoint
CREATE INDEX "ix_schedule_due_date" ON "settlement_schedule" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");