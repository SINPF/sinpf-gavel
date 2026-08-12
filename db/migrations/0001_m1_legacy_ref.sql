ALTER TABLE "case_referrals" ADD COLUMN "legacy_ref" text;--> statement-breakpoint
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_legacy_ref_unique" UNIQUE("legacy_ref");