-- The catalog's labels move from one column per language (`label_fr`,
-- `label_ar`) to translation tables, one row per language: adding English, or
-- Italian, is inserting rows — no column, no schema change, no deployment of
-- the API. A reader whose language has no row falls back to French.
--
-- `locale` is a lowercase language code, optionally with a region (`fr`,
-- `ar`, `en`, `pt-BR`), checked here so that a typo cannot create a language
-- nobody reads.

CREATE TABLE "public"."equipment_category_translations" (
    "category_code" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "pk_equipment_category_translations" PRIMARY KEY ("category_code", "locale"),
    CONSTRAINT "ck_equipment_category_translations_locale" CHECK ("locale" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
    CONSTRAINT "ck_equipment_category_translations_label" CHECK (btrim("label") <> '')
);

CREATE TABLE "public"."equipment_type_translations" (
    "type_code" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "pk_equipment_type_translations" PRIMARY KEY ("type_code", "locale"),
    CONSTRAINT "ck_equipment_type_translations_locale" CHECK ("locale" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
    CONSTRAINT "ck_equipment_type_translations_label" CHECK (btrim("label") <> '')
);

-- A translation belongs to its entry: removing a type removes its labels.
ALTER TABLE "public"."equipment_category_translations"
  ADD CONSTRAINT "fk_equipment_category_translations_equipment_categories" FOREIGN KEY ("category_code")
  REFERENCES "public"."equipment_categories"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."equipment_type_translations"
  ADD CONSTRAINT "fk_equipment_type_translations_equipment_types" FOREIGN KEY ("type_code")
  REFERENCES "public"."equipment_types"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- The labels already there, carried over before their columns go.
INSERT INTO "public"."equipment_category_translations" ("category_code", "locale", "label")
SELECT "code", 'fr', "label_fr" FROM "public"."equipment_categories"
UNION ALL
SELECT "code", 'ar', "label_ar" FROM "public"."equipment_categories";

INSERT INTO "public"."equipment_type_translations" ("type_code", "locale", "label")
SELECT "code", 'fr', "label_fr" FROM "public"."equipment_types"
UNION ALL
SELECT "code", 'ar', "label_ar" FROM "public"."equipment_types";

ALTER TABLE "public"."equipment_categories" DROP COLUMN "label_fr", DROP COLUMN "label_ar";
ALTER TABLE "public"."equipment_types" DROP COLUMN "label_fr", DROP COLUMN "label_ar";
