CREATE TYPE "public"."contract_document_type" AS ENUM('signed_contract', 'draft_contract', 'variation_addendum', 'termination_notice', 'other');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('lease', 'service_agreement', 'mou', 'supply', 'consultancy', 'other');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('sbd', 'usd', 'aud', 'nzd', 'eur', 'other');--> statement-breakpoint
ALTER TYPE "public"."alert_type" ADD VALUE 'contract_expiry';--> statement-breakpoint
CREATE TABLE "contract_attachments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"document_type" "contract_document_type" DEFAULT 'other' NOT NULL,
	"is_withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawn_by" text,
	"withdrawn_at" timestamp,
	"withdrawal_reason" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_ref_sequence" (
	"year" integer PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_ref" text NOT NULL,
	"title" text NOT NULL,
	"parties" text[] NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"contract_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" "currency" DEFAULT 'sbd' NOT NULL,
	"terminated_date" date,
	"termination_reason" text,
	"terminated_by" text,
	"owning_department" text,
	"linked_title_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "contracts_contract_ref_unique" UNIQUE("contract_ref")
);
--> statement-breakpoint
DROP INDEX "uq_alert_dedupe";--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "case_referral_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "contract_id" text;--> statement-breakpoint
ALTER TABLE "contract_attachments" ADD CONSTRAINT "contract_attachments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_attachments" ADD CONSTRAINT "contract_attachments_withdrawn_by_user_id_fk" FOREIGN KEY ("withdrawn_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_attachments" ADD CONSTRAINT "contract_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_terminated_by_user_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_contract_attachment_contract" ON "contract_attachments" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "ix_contract_title" ON "contracts" USING btree ("title");--> statement-breakpoint
CREATE INDEX "ix_contract_type" ON "contracts" USING btree ("contract_type");--> statement-breakpoint
CREATE INDEX "ix_contract_end_date" ON "contracts" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "ix_contract_parties" ON "contracts" USING gin ("parties");--> statement-breakpoint
CREATE INDEX "ix_contract_linked_title" ON "contracts" USING btree ("linked_title_id");--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alert_dedupe" ON "alerts" USING btree ("case_referral_id","contract_id","recipient_id","dedupe_key");