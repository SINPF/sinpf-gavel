ALTER TABLE "contracts" ADD COLUMN "financial_year" integer;--> statement-breakpoint
UPDATE "contracts" SET "financial_year" = EXTRACT(YEAR FROM "start_date")::integer - CASE WHEN EXTRACT(MONTH FROM "start_date") < 7 THEN 1 ELSE 0 END;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "financial_year" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_contract_financial_year" ON "contracts" USING btree ("financial_year");