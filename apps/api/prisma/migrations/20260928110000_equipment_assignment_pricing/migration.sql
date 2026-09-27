-- An assignment keeps the price it was made at.
--
-- Its cost used to be recomputed on every read from the machine's *current*
-- rate: a rental going from 450 to 500 a day changed the cost of every
-- worksite the machine had ever been on. Now each assignment stores the
-- machine's pricing as it stood when it was made (`pricing`, the shape of
-- `EquipmentCostInput` in @chantia/shared) and the cost computed from it
-- (`cost`). A new rate applies to the next assignments only.

ALTER TABLE "public"."equipment_assignments"
  ADD COLUMN "pricing" JSONB,
  ADD COLUMN "cost" DECIMAL(14,3);

-- Assignments made before this migration take the machine's pricing as it is
-- now — the only one there is to take.
UPDATE "public"."equipment_assignments" a
   SET "pricing" = jsonb_build_object(
         'acquisitionMethod', e."acquisition_method"::text,
         'acquisitionDate',   to_char(e."acquisition_date", 'YYYY-MM-DD'),
         'purchasePrice',     e."purchase_price",
         'residualValue',     e."residual_value",
         'usefulLifeMonths',  e."useful_life_months",
         'monthlyPayment',    e."monthly_payment",
         'dailyRate',         e."daily_rate",
         'contractEndDate',   to_char(e."contract_end_date", 'YYYY-MM-DD'),
         'disposalDate',      to_char(e."disposal_date", 'YYYY-MM-DD')
       )
  FROM "public"."equipment" e
 WHERE e."id" = a."equipment_id";

-- And their cost, day by day — the rule of `equipmentDailyCost` in
-- @chantia/shared, calendar days, both ends included:
--   owned            (price − residual) ÷ days of the depreciation period,
--                    until its last day (acquisition + lifetime − 1 day);
--   leasing, LLD     monthly payment × 12 ÷ 365, until the contract ends;
--   short-term hire  the daily rate, until the hire ends;
-- nothing before the acquisition, nothing after the disposal. Postgres adds
-- months the way `addMonths` does — clamped to the end of the month.
UPDATE "public"."equipment_assignments" a
   SET "cost" = (
     SELECT COALESCE(round(sum(
       CASE
         WHEN day < e."acquisition_date" THEN 0
         WHEN e."disposal_date" IS NOT NULL AND day > e."disposal_date" THEN 0
         WHEN e."acquisition_method" IN ('cash_purchase', 'credit_purchase') THEN
           CASE
             WHEN e."purchase_price" IS NULL OR e."useful_life_months" IS NULL THEN 0
             WHEN day > (e."acquisition_date" + make_interval(months => e."useful_life_months"))::date - 1 THEN 0
             ELSE greatest(0, e."purchase_price" - COALESCE(e."residual_value", 0))
                  / (((e."acquisition_date" + make_interval(months => e."useful_life_months"))::date - 1)
                     - e."acquisition_date" + 1)
           END
         WHEN e."contract_end_date" IS NOT NULL AND day > e."contract_end_date" THEN 0
         WHEN e."acquisition_method" IN ('leasing', 'long_term_rental') THEN
           COALESCE(e."monthly_payment", 0) * 12 / 365
         ELSE COALESCE(e."daily_rate", 0)
       END
     ), 3), 0)
     FROM (
       SELECT g.d::date AS day
         FROM generate_series(a."start_date"::timestamp, a."end_date"::timestamp, interval '1 day') AS g(d)
     ) AS days
   )
  FROM "public"."equipment" e
 WHERE e."id" = a."equipment_id";

ALTER TABLE "public"."equipment_assignments"
  ALTER COLUMN "pricing" SET NOT NULL,
  ALTER COLUMN "cost" SET NOT NULL;
