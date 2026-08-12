CREATE TYPE "public"."insurance_policy_document_type" AS ENUM('policy_schedule', 'renewal_notice', 'claim_document', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_policy_type" AS ENUM('medical', 'property');--> statement-breakpoint
ALTER TYPE "public"."alert_type" ADD VALUE 'insurance_expiry';--> statement-breakpoint
CREATE TABLE "insurance_policies" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_ref" text NOT NULL,
	"policy_number" text NOT NULL,
	"insurer_name" text NOT NULL,
	"insurer_contact" text,
	"policy_type" "insurance_policy_type" NOT NULL,
	"insured_subject" text NOT NULL,
	"linked_title_id" text,
	"coverage_start" date NOT NULL,
	"coverage_end" date NOT NULL,
	"policy_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"premium_amount" numeric(15, 2),
	"currency" "currency" DEFAULT 'sbd' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "insurance_policies_policy_ref_unique" UNIQUE("policy_ref")
);
--> statement-breakpoint
CREATE TABLE "insurance_policy_attachments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurance_policy_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"document_type" "insurance_policy_document_type" DEFAULT 'other' NOT NULL,
	"is_withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawn_by" text,
	"withdrawn_at" timestamp,
	"withdrawal_reason" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_policy_ref_sequence" (
	"year" integer PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
DROP INDEX "uq_alert_dedupe";--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "insurance_policy_id" text;--> statement-breakpoint
ALTER TABLE "user_notification_pref" ADD COLUMN "email_insurance_expiry" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policy_attachments" ADD CONSTRAINT "insurance_policy_attachments_insurance_policy_id_insurance_policies_id_fk" FOREIGN KEY ("insurance_policy_id") REFERENCES "public"."insurance_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policy_attachments" ADD CONSTRAINT "insurance_policy_attachments_withdrawn_by_user_id_fk" FOREIGN KEY ("withdrawn_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_policy_attachments" ADD CONSTRAINT "insurance_policy_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_insurance_policy_insurer" ON "insurance_policies" USING btree ("insurer_name");--> statement-breakpoint
CREATE INDEX "ix_insurance_policy_type" ON "insurance_policies" USING btree ("policy_type");--> statement-breakpoint
CREATE INDEX "ix_insurance_policy_coverage_end" ON "insurance_policies" USING btree ("coverage_end");--> statement-breakpoint
CREATE INDEX "ix_insurance_policy_linked_title" ON "insurance_policies" USING btree ("linked_title_id");--> statement-breakpoint
CREATE INDEX "ix_insurance_policy_number" ON "insurance_policies" USING btree ("insurer_name","policy_number");--> statement-breakpoint
CREATE INDEX "ix_insurance_policy_attachment_policy" ON "insurance_policy_attachments" USING btree ("insurance_policy_id");--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_insurance_policy_id_insurance_policies_id_fk" FOREIGN KEY ("insurance_policy_id") REFERENCES "public"."insurance_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alert_dedupe" ON "alerts" USING btree ("case_referral_id","contract_id","insurance_policy_id","recipient_id","dedupe_key");