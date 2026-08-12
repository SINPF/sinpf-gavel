CREATE TYPE "public"."legal_opinion_document_type" AS ENUM('signed_opinion', 'draft_opinion', 'supporting_material', 'other');--> statement-breakpoint
CREATE TYPE "public"."legal_opinion_state" AS ENUM('draft', 'finalised');--> statement-breakpoint
CREATE TABLE "legal_opinion_attachments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_opinion_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"document_type" "legal_opinion_document_type" DEFAULT 'other' NOT NULL,
	"is_withdrawn" boolean DEFAULT false NOT NULL,
	"withdrawn_by" text,
	"withdrawn_at" timestamp,
	"withdrawal_reason" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_opinion_ref_sequence" (
	"year" integer PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_opinions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opinion_ref" text NOT NULL,
	"subject_matter" text NOT NULL,
	"requesting_department" text NOT NULL,
	"date_requested" date,
	"opinion_date" date NOT NULL,
	"author_id" text NOT NULL,
	"summary" text,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"state" "legal_opinion_state" DEFAULT 'draft' NOT NULL,
	"supersedes_opinion_id" text,
	"finalised_at" timestamp,
	"finalised_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "legal_opinions_opinion_ref_unique" UNIQUE("opinion_ref")
);
--> statement-breakpoint
ALTER TABLE "legal_opinion_attachments" ADD CONSTRAINT "legal_opinion_attachments_legal_opinion_id_legal_opinions_id_fk" FOREIGN KEY ("legal_opinion_id") REFERENCES "public"."legal_opinions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinion_attachments" ADD CONSTRAINT "legal_opinion_attachments_withdrawn_by_user_id_fk" FOREIGN KEY ("withdrawn_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinion_attachments" ADD CONSTRAINT "legal_opinion_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_finalised_by_user_id_fk" FOREIGN KEY ("finalised_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_attachment_opinion" ON "legal_opinion_attachments" USING btree ("legal_opinion_id");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_subject" ON "legal_opinions" USING btree ("subject_matter");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_dept" ON "legal_opinions" USING btree ("requesting_department");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_author" ON "legal_opinions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_state" ON "legal_opinions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_opinion_date" ON "legal_opinions" USING btree ("opinion_date");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_supersedes" ON "legal_opinions" USING btree ("supersedes_opinion_id");--> statement-breakpoint
CREATE INDEX "ix_legal_opinion_keywords" ON "legal_opinions" USING gin ("keywords");