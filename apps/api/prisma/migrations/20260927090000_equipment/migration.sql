-- The fleet: each organization's machines — owned, leased or hired. The type
-- of a machine is a code from the fixed catalog in `@chantia/shared`
-- (`EQUIPMENT_TYPES`); the catalog is code, not a table, so `type_code` has no
-- foreign key and is validated by the API.

CREATE TYPE "public"."acquisition_method" AS ENUM (
  'cash_purchase', 'credit_purchase', 'leasing', 'long_term_rental', 'short_term_rental'
);

CREATE TYPE "public"."equipment_status" AS ENUM ('in_service', 'under_maintenance', 'retired');

CREATE TABLE "public"."equipment" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type_code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "fleet_number" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "registration_number" TEXT,
    "manufacture_year" INTEGER,
    "status" "public"."equipment_status" NOT NULL DEFAULT 'in_service',
    "acquisition_method" "public"."acquisition_method" NOT NULL,
    "acquisition_date" DATE NOT NULL,
    "supplier" TEXT,
    "purchase_price" DECIMAL(14,3),
    "residual_value" DECIMAL(14,3),
    "useful_life_months" INTEGER,
    "monthly_payment" DECIMAL(14,3),
    "buyout_value" DECIMAL(14,3),
    "daily_rate" DECIMAL(14,3),
    "contract_end_date" DATE,
    "disposal_date" DATE,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_equipment" PRIMARY KEY ("id")
);

CREATE INDEX "ix_equipment_organization_id" ON "public"."equipment"("organization_id");

-- Partial, like `uq_worksites_organization_id_code`: a deleted machine frees
-- its fleet number. Prisma cannot declare the predicate and reads the index
-- back as the plain `@@unique` of the schema — same name, same columns.
CREATE UNIQUE INDEX "uq_equipment_organization_id_fleet_number"
  ON "public"."equipment" ("organization_id", "fleet_number")
  WHERE "deleted_at" IS NULL;
