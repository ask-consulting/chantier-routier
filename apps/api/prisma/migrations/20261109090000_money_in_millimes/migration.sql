-- The dinar counts millimes: every remaining amount moves to three decimals,
-- like the equipment tables already are. Widening is lossless.
ALTER TABLE "public"."worksites" ALTER COLUMN "total_budget" TYPE DECIMAL(14,3);
ALTER TABLE "public"."workers" ALTER COLUMN "hourly_rate" TYPE DECIMAL(10,3);
ALTER TABLE "public"."expenses" ALTER COLUMN "amount" TYPE DECIMAL(14,3);

-- Chantia is sold in Tunisia. Nothing has ever let an organization choose its
-- currency, so an 'EUR' here is the old default and not a decision.
ALTER TABLE "identity"."organizations" ALTER COLUMN "currency" SET DEFAULT 'TND';
UPDATE "identity"."organizations" SET "currency" = 'TND' WHERE "currency" = 'EUR';
