-- Every amount becomes a whole number of the currency's smallest unit: millimes
-- for the dinar, cents for the euro. What an amount means depends on the
-- organization's currency, which is why that currency can never change once
-- there is data.
--
-- All organizations are in TND at this point (see 20261109090000), so every
-- value is multiplied by 1000. BIGINT and not INT: an INT stops at 2,147,483
-- dinars in millimes, below the budget of a road.

ALTER TABLE "public"."worksites" ALTER COLUMN "total_budget" TYPE BIGINT USING round("total_budget" * 1000)::bigint;
ALTER TABLE "public"."workers" ALTER COLUMN "hourly_rate" TYPE BIGINT USING round("hourly_rate" * 1000)::bigint;
ALTER TABLE "public"."expenses" ALTER COLUMN "amount" TYPE BIGINT USING round("amount" * 1000)::bigint;
ALTER TABLE "public"."equipment"
  ALTER COLUMN "purchase_price" TYPE BIGINT USING round("purchase_price" * 1000)::bigint,
  ALTER COLUMN "residual_value" TYPE BIGINT USING round("residual_value" * 1000)::bigint,
  ALTER COLUMN "monthly_payment" TYPE BIGINT USING round("monthly_payment" * 1000)::bigint,
  ALTER COLUMN "buyout_value" TYPE BIGINT USING round("buyout_value" * 1000)::bigint,
  ALTER COLUMN "daily_rate" TYPE BIGINT USING round("daily_rate" * 1000)::bigint;
ALTER TABLE "public"."equipment_assignments" ALTER COLUMN "cost" TYPE BIGINT USING round("cost" * 1000)::bigint;

-- The pricing frozen on each assignment holds amounts too.
UPDATE "public"."equipment_assignments" a
   SET "pricing" = a."pricing" || converted.amounts
  FROM (
    SELECT b."id", jsonb_object_agg(k, to_jsonb(round((b."pricing" ->> k)::numeric * 1000)::bigint)) AS amounts
      FROM "public"."equipment_assignments" b
     CROSS JOIN unnest(ARRAY['purchasePrice', 'residualValue', 'monthlyPayment', 'dailyRate']) AS k
     WHERE jsonb_typeof(b."pricing" -> k) = 'number'
     GROUP BY b."id"
  ) converted
 WHERE converted."id" = a."id";
