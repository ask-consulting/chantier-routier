-- Chantia is sold in Tunisia. Nothing has ever let an organization choose its
-- currency, so an 'EUR' here is the old default and not a decision.
--
-- This migration also moved three amounts to three decimals, which shortened
-- their integer part and failed in production on a large hourly rate. It no
-- longer does: 20261109130000 turns them into whole millimes directly.
ALTER TABLE "identity"."organizations" ALTER COLUMN "currency" SET DEFAULT 'TND';
UPDATE "identity"."organizations" SET "currency" = 'TND' WHERE "currency" = 'EUR';
