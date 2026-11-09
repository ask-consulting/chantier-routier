-- The equipment catalog gets UUID primary keys, like every other table. Its
-- codes stay, as unique, readable names.
--
-- The UUIDs are derived from the codes, so that they are the same in every
-- environment. The version and variant bits are set to make them valid UUIDs.
CREATE FUNCTION pg_temp.reference_uuid(key text) RETURNS uuid AS $$
  SELECT (substr(h, 1, 12) || '5' || substr(h, 14, 3) || '8' || substr(h, 18, 15))::uuid FROM md5(key) AS h
$$ LANGUAGE sql IMMUTABLE;

-- New columns, filled from the old keys.
ALTER TABLE "public"."equipment_categories" ADD COLUMN "id" UUID;
UPDATE "public"."equipment_categories" SET "id" = pg_temp.reference_uuid('equipment_category:' || "code");

ALTER TABLE "public"."equipment_types" ADD COLUMN "id" UUID, ADD COLUMN "category_id" UUID;
UPDATE "public"."equipment_types" SET
  "id" = pg_temp.reference_uuid('equipment_type:' || "code"),
  "category_id" = pg_temp.reference_uuid('equipment_category:' || "category_code");

ALTER TABLE "public"."equipment_category_translations" ADD COLUMN "category_id" UUID;
UPDATE "public"."equipment_category_translations" SET "category_id" = pg_temp.reference_uuid('equipment_category:' || "category_code");

ALTER TABLE "public"."equipment_type_translations" ADD COLUMN "type_id" UUID;
UPDATE "public"."equipment_type_translations" SET "type_id" = pg_temp.reference_uuid('equipment_type:' || "type_code");

ALTER TABLE "public"."equipment" ADD COLUMN "type_id" UUID;
UPDATE "public"."equipment" SET "type_id" = pg_temp.reference_uuid('equipment_type:' || "type_code");

-- The old keys go, foreign keys first.
ALTER TABLE "public"."equipment" DROP CONSTRAINT "fk_equipment_equipment_types";
ALTER TABLE "public"."equipment_type_translations" DROP CONSTRAINT "fk_equipment_type_translations_equipment_types";
ALTER TABLE "public"."equipment_category_translations" DROP CONSTRAINT "fk_equipment_category_translations_equipment_categories";
ALTER TABLE "public"."equipment_types" DROP CONSTRAINT "fk_equipment_types_equipment_categories";

ALTER TABLE "public"."equipment_type_translations" DROP CONSTRAINT "pk_equipment_type_translations";
ALTER TABLE "public"."equipment_category_translations" DROP CONSTRAINT "pk_equipment_category_translations";
ALTER TABLE "public"."equipment_types" DROP CONSTRAINT "pk_equipment_types";
ALTER TABLE "public"."equipment_categories" DROP CONSTRAINT "pk_equipment_categories";

ALTER TABLE "public"."equipment" DROP COLUMN "type_code";
ALTER TABLE "public"."equipment_type_translations" DROP COLUMN "type_code";
ALTER TABLE "public"."equipment_category_translations" DROP COLUMN "category_code";
ALTER TABLE "public"."equipment_types" DROP COLUMN "category_code";

-- The new keys.
ALTER TABLE "public"."equipment_categories" ALTER COLUMN "id" SET NOT NULL, ADD CONSTRAINT "pk_equipment_categories" PRIMARY KEY ("id");
ALTER TABLE "public"."equipment_types" ALTER COLUMN "id" SET NOT NULL, ALTER COLUMN "category_id" SET NOT NULL, ADD CONSTRAINT "pk_equipment_types" PRIMARY KEY ("id");
ALTER TABLE "public"."equipment_category_translations" ALTER COLUMN "category_id" SET NOT NULL, ADD CONSTRAINT "pk_equipment_category_translations" PRIMARY KEY ("category_id", "locale");
ALTER TABLE "public"."equipment_type_translations" ALTER COLUMN "type_id" SET NOT NULL, ADD CONSTRAINT "pk_equipment_type_translations" PRIMARY KEY ("type_id", "locale");
ALTER TABLE "public"."equipment" ALTER COLUMN "type_id" SET NOT NULL;

CREATE UNIQUE INDEX "uq_equipment_categories_code" ON "public"."equipment_categories"("code");
CREATE UNIQUE INDEX "uq_equipment_types_code" ON "public"."equipment_types"("code");
CREATE INDEX "ix_equipment_types_category_id" ON "public"."equipment_types"("category_id");

ALTER TABLE "public"."equipment_types" ADD CONSTRAINT "fk_equipment_types_equipment_categories" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "public"."equipment_category_translations" ADD CONSTRAINT "fk_equipment_category_translations_equipment_categories" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."equipment_type_translations" ADD CONSTRAINT "fk_equipment_type_translations_equipment_types" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."equipment" ADD CONSTRAINT "fk_equipment_equipment_types" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_types"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
