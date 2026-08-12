CREATE TYPE "public"."encumbrance_state" AS ENUM('active', 'discharged');--> statement-breakpoint
CREATE TYPE "public"."encumbrance_type" AS ENUM('lease', 'mortgage', 'caveat', 'easement', 'other');--> statement-breakpoint
CREATE TYPE "public"."title_document_type" AS ENUM('title_deed', 'certificate_of_title', 'survey_plan', 'encumbrance_document', 'discharge_document', 'other');--> statement-breakpoint
CREATE TYPE "public"."title_ownership_type" AS ENUM('perpetual_estate', 'fixed_term_estate', 'leasehold_interest', 'other');--> statement-breakpoint
CREATE TABLE "encumbrances" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" text NOT NULL,
	"encumbrance_type" "encumbrance_type" NOT NULL,
	"holder_name" text NOT NULL,
	"registered_date" date NOT NULL,
	"expiry_date" date,
	"state" "encumbrance_state" DEFAULT 'active' NOT NULL,
	"discharged_date" date,
	"discharged_by" text,
	"discharge_reason" text,
	"linked_contract_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "title_attachments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" text NOT NULL,
	"encumbrance_id" text,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"document_type" "title_document_type" DEFAULT 'other' NOT NULL,
	"is_withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawn_by" text,
	"withdrawn_at" timestamp,
	"withdrawal_reason" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_number" text NOT NULL,
	"location" text NOT NULL,
	"ownership_type" "title_ownership_type" NOT NULL,
	"registered_owner" text,
	"term_start" date,
	"term_end" date,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "titles_title_number_unique" UNIQUE("title_number")
);
--> statement-breakpoint
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_discharged_by_user_id_fk" FOREIGN KEY ("discharged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_attachments" ADD CONSTRAINT "title_attachments_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_attachments" ADD CONSTRAINT "title_attachments_encumbrance_id_encumbrances_id_fk" FOREIGN KEY ("encumbrance_id") REFERENCES "public"."encumbrances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_attachments" ADD CONSTRAINT "title_attachments_withdrawn_by_user_id_fk" FOREIGN KEY ("withdrawn_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_attachments" ADD CONSTRAINT "title_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_encumbrance_title" ON "encumbrances" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "ix_encumbrance_state" ON "encumbrances" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ix_encumbrance_expiry" ON "encumbrances" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "ix_encumbrance_linked_contract" ON "encumbrances" USING btree ("linked_contract_id");--> statement-breakpoint
CREATE INDEX "ix_title_attachment_title" ON "title_attachments" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "ix_title_attachment_encumbrance" ON "title_attachments" USING btree ("encumbrance_id");--> statement-breakpoint
CREATE INDEX "ix_title_number" ON "titles" USING btree ("title_number");--> statement-breakpoint
CREATE INDEX "ix_title_location" ON "titles" USING btree ("location");--> statement-breakpoint
CREATE INDEX "ix_title_ownership" ON "titles" USING btree ("ownership_type");--> statement-breakpoint
CREATE INDEX "ix_title_term_end" ON "titles" USING btree ("term_end");