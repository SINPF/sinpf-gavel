ALTER TYPE "public"."activity_type" ADD VALUE 'payment_recorded';--> statement-breakpoint
ALTER TYPE "public"."activity_type" ADD VALUE 'action_undone';--> statement-breakpoint
CREATE TABLE "case_payments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_referral_id" text NOT NULL,
	"payment_date" date NOT NULL,
	"contributions_paid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"surcharges_paid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"wages_paid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reference" text,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_attachments" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD COLUMN "uploaded_by" text;--> statement-breakpoint
ALTER TABLE "case_payments" ADD CONSTRAINT "case_payments_case_referral_id_case_referrals_id_fk" FOREIGN KEY ("case_referral_id") REFERENCES "public"."case_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_payments" ADD CONSTRAINT "case_payments_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;