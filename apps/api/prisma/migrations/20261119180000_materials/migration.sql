-- The material catalog, and what each task is planned to need of it.
--
-- A common catalog, global and written only by migrations, like the equipment
-- catalog: zeft, 7jar, trab, sand, cement… Each organization adds its own
-- materials beside it. A task's planned need points at one or the other,
-- never both.
--
-- The Tunisian labels, in Arabic (`aeb`) and Latin (`aeb-Latn`) letters, are
-- to be reviewed by someone from the trade, like those of the plan library.

-- CreateEnum
CREATE TYPE "public"."material_unit" AS ENUM ('t', 'm3', 'm2', 'm', 'kg', 'l', 'bag', 'piece');

-- CreateTable
CREATE TABLE "public"."material_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "pk_material_categories" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."catalog_materials" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "unit" "public"."material_unit" NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "pk_catalog_materials" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."material_category_translations" (
    "category_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "pk_material_category_translations" PRIMARY KEY ("category_id","locale")
);

-- CreateTable
CREATE TABLE "public"."catalog_material_translations" (
    "material_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "pk_catalog_material_translations" PRIMARY KEY ("material_id","locale")
);

-- CreateTable
CREATE TABLE "public"."materials" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "unit" "public"."material_unit" NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_materials" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_materials" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "worksite_task_id" UUID NOT NULL,
    "catalog_material_id" UUID,
    "material_id" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_task_materials" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_material_categories_code" ON "public"."material_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_catalog_materials_code" ON "public"."catalog_materials"("code");

-- CreateIndex
CREATE INDEX "ix_catalog_materials_category_id" ON "public"."catalog_materials"("category_id");

-- CreateIndex
CREATE INDEX "ix_materials_organization_id" ON "public"."materials"("organization_id");

-- CreateIndex
CREATE INDEX "ix_task_materials_organization_id" ON "public"."task_materials"("organization_id");

-- CreateIndex
CREATE INDEX "ix_task_materials_catalog_material_id" ON "public"."task_materials"("catalog_material_id");

-- CreateIndex
CREATE INDEX "ix_task_materials_material_id" ON "public"."task_materials"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_task_materials_worksite_task_id_catalog_material_id" ON "public"."task_materials"("worksite_task_id", "catalog_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_task_materials_worksite_task_id_material_id" ON "public"."task_materials"("worksite_task_id", "material_id");

-- AddForeignKey
ALTER TABLE "public"."catalog_materials" ADD CONSTRAINT "fk_catalog_materials_material_categories" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."material_category_translations" ADD CONSTRAINT "fk_material_category_translations_material_categories" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catalog_material_translations" ADD CONSTRAINT "fk_catalog_material_translations_catalog_materials" FOREIGN KEY ("material_id") REFERENCES "public"."catalog_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."materials" ADD CONSTRAINT "fk_materials_material_categories" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_materials" ADD CONSTRAINT "fk_task_materials_worksite_tasks" FOREIGN KEY ("worksite_task_id") REFERENCES "public"."worksite_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_materials" ADD CONSTRAINT "fk_task_materials_catalog_materials" FOREIGN KEY ("catalog_material_id") REFERENCES "public"."catalog_materials"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_materials" ADD CONSTRAINT "fk_task_materials_materials" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE NO ACTION ON UPDATE CASCADE;



-- Two live materials of one organization never share a name, whatever the case.
-- A removed one frees its name.
CREATE UNIQUE INDEX "uq_materials_organization_id_label" ON "public"."materials"("organization_id", lower("label")) WHERE "deleted_at" IS NULL;

-- A planned need is for exactly one material: of the catalog, or the organization's own.
ALTER TABLE "public"."task_materials" ADD CONSTRAINT "ck_task_materials_one_material"
  CHECK (("catalog_material_id" IS NULL) <> ("material_id" IS NULL));
ALTER TABLE "public"."task_materials" ADD CONSTRAINT "ck_task_materials_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "public"."task_materials" ADD CONSTRAINT "ck_task_materials_unit_price_not_negative" CHECK ("unit_price" >= 0);

-- The catalog. UUIDs derived from the codes, the same in every environment
-- (see 20261109150000_equipment_catalog_uuids).
CREATE OR REPLACE FUNCTION pg_temp.reference_uuid(key text) RETURNS uuid AS $$
  SELECT (substr(h, 1, 12) || '5' || substr(h, 14, 3) || '8' || substr(h, 18, 15))::uuid FROM md5(key) AS h
$$ LANGUAGE sql IMMUTABLE;

INSERT INTO "public"."material_categories" ("id", "code", "sort_order") VALUES
  (pg_temp.reference_uuid('material_category:aggregates'), 'aggregates', 1),
  (pg_temp.reference_uuid('material_category:binders'), 'binders', 2),
  (pg_temp.reference_uuid('material_category:steel'), 'steel', 3),
  (pg_temp.reference_uuid('material_category:masonry'), 'masonry', 4),
  (pg_temp.reference_uuid('material_category:road'), 'road', 5),
  (pg_temp.reference_uuid('material_category:networks'), 'networks', 6),
  (pg_temp.reference_uuid('material_category:finishes'), 'finishes', 7),
  (pg_temp.reference_uuid('material_category:site'), 'site', 8);

INSERT INTO "public"."material_category_translations" ("category_id", "locale", "label") VALUES
  (pg_temp.reference_uuid('material_category:aggregates'), 'fr', 'Granulats et terres'),
  (pg_temp.reference_uuid('material_category:aggregates'), 'ar', 'الحصى والأتربة'),
  (pg_temp.reference_uuid('material_category:aggregates'), 'aeb', 'الرمل والحصى والتراب'),
  (pg_temp.reference_uuid('material_category:aggregates'), 'aeb-Latn', 'Rmal, 7ssé w trab'),
  (pg_temp.reference_uuid('material_category:binders'), 'fr', 'Liants et bétons'),
  (pg_temp.reference_uuid('material_category:binders'), 'ar', 'المواد الرابطة والخرسانة'),
  (pg_temp.reference_uuid('material_category:binders'), 'aeb', 'السيمان والبيتون'),
  (pg_temp.reference_uuid('material_category:binders'), 'aeb-Latn', 'Simen w béton'),
  (pg_temp.reference_uuid('material_category:steel'), 'fr', 'Aciers'),
  (pg_temp.reference_uuid('material_category:steel'), 'ar', 'الحديد'),
  (pg_temp.reference_uuid('material_category:steel'), 'aeb', 'الحديد'),
  (pg_temp.reference_uuid('material_category:steel'), 'aeb-Latn', 'El 7did'),
  (pg_temp.reference_uuid('material_category:masonry'), 'fr', 'Maçonnerie'),
  (pg_temp.reference_uuid('material_category:masonry'), 'ar', 'مواد البناء'),
  (pg_temp.reference_uuid('material_category:masonry'), 'aeb', 'البني'),
  (pg_temp.reference_uuid('material_category:masonry'), 'aeb-Latn', 'El bni'),
  (pg_temp.reference_uuid('material_category:road'), 'fr', 'Bitumes et enrobés'),
  (pg_temp.reference_uuid('material_category:road'), 'ar', 'الإسفلت والخلطات الإسفلتية'),
  (pg_temp.reference_uuid('material_category:road'), 'aeb', 'الزفت'),
  (pg_temp.reference_uuid('material_category:road'), 'aeb-Latn', 'Ezzeft'),
  (pg_temp.reference_uuid('material_category:networks'), 'fr', 'Réseaux et assainissement'),
  (pg_temp.reference_uuid('material_category:networks'), 'ar', 'الشبكات والتطهير'),
  (pg_temp.reference_uuid('material_category:networks'), 'aeb', 'القنوات'),
  (pg_temp.reference_uuid('material_category:networks'), 'aeb-Latn', 'El qanawét'),
  (pg_temp.reference_uuid('material_category:finishes'), 'fr', 'Second œuvre et finitions'),
  (pg_temp.reference_uuid('material_category:finishes'), 'ar', 'التشطيبات'),
  (pg_temp.reference_uuid('material_category:finishes'), 'aeb', 'الفينيسيون'),
  (pg_temp.reference_uuid('material_category:finishes'), 'aeb-Latn', 'El finitions'),
  (pg_temp.reference_uuid('material_category:site'), 'fr', 'Coffrage et consommables'),
  (pg_temp.reference_uuid('material_category:site'), 'ar', 'القوالب والمستهلكات'),
  (pg_temp.reference_uuid('material_category:site'), 'aeb', 'الكوفراج والسلعة الصغيرة'),
  (pg_temp.reference_uuid('material_category:site'), 'aeb-Latn', 'Coffrage w sel3a sghira');

INSERT INTO "public"."catalog_materials" ("id", "code", "category_id", "unit", "sort_order") VALUES
  (pg_temp.reference_uuid('catalog_material:sand'), 'sand', pg_temp.reference_uuid('material_category:aggregates'), 'm3', 1),
  (pg_temp.reference_uuid('catalog_material:gravel'), 'gravel', pg_temp.reference_uuid('material_category:aggregates'), 'm3', 2),
  (pg_temp.reference_uuid('catalog_material:crushed-gravel'), 'crushed-gravel', pg_temp.reference_uuid('material_category:aggregates'), 't', 3),
  (pg_temp.reference_uuid('catalog_material:all-in-aggregate'), 'all-in-aggregate', pg_temp.reference_uuid('material_category:aggregates'), 't', 4),
  (pg_temp.reference_uuid('catalog_material:tuff'), 'tuff', pg_temp.reference_uuid('material_category:aggregates'), 'm3', 5),
  (pg_temp.reference_uuid('catalog_material:rubble-stone'), 'rubble-stone', pg_temp.reference_uuid('material_category:aggregates'), 'm3', 6),
  (pg_temp.reference_uuid('catalog_material:fill-earth'), 'fill-earth', pg_temp.reference_uuid('material_category:aggregates'), 'm3', 7),
  (pg_temp.reference_uuid('catalog_material:cement'), 'cement', pg_temp.reference_uuid('material_category:binders'), 'bag', 1),
  (pg_temp.reference_uuid('catalog_material:lime'), 'lime', pg_temp.reference_uuid('material_category:binders'), 'bag', 2),
  (pg_temp.reference_uuid('catalog_material:plaster'), 'plaster', pg_temp.reference_uuid('material_category:binders'), 'bag', 3),
  (pg_temp.reference_uuid('catalog_material:ready-mix-concrete'), 'ready-mix-concrete', pg_temp.reference_uuid('material_category:binders'), 'm3', 4),
  (pg_temp.reference_uuid('catalog_material:rebar'), 'rebar', pg_temp.reference_uuid('material_category:steel'), 't', 1),
  (pg_temp.reference_uuid('catalog_material:welded-mesh'), 'welded-mesh', pg_temp.reference_uuid('material_category:steel'), 'piece', 2),
  (pg_temp.reference_uuid('catalog_material:binding-wire'), 'binding-wire', pg_temp.reference_uuid('material_category:steel'), 'kg', 3),
  (pg_temp.reference_uuid('catalog_material:brick'), 'brick', pg_temp.reference_uuid('material_category:masonry'), 'piece', 1),
  (pg_temp.reference_uuid('catalog_material:concrete-block'), 'concrete-block', pg_temp.reference_uuid('material_category:masonry'), 'piece', 2),
  (pg_temp.reference_uuid('catalog_material:hollow-block'), 'hollow-block', pg_temp.reference_uuid('material_category:masonry'), 'piece', 3),
  (pg_temp.reference_uuid('catalog_material:bitumen'), 'bitumen', pg_temp.reference_uuid('material_category:road'), 't', 1),
  (pg_temp.reference_uuid('catalog_material:asphalt-mix'), 'asphalt-mix', pg_temp.reference_uuid('material_category:road'), 't', 2),
  (pg_temp.reference_uuid('catalog_material:bitumen-emulsion'), 'bitumen-emulsion', pg_temp.reference_uuid('material_category:road'), 't', 3),
  (pg_temp.reference_uuid('catalog_material:kerb'), 'kerb', pg_temp.reference_uuid('material_category:road'), 'm', 4),
  (pg_temp.reference_uuid('catalog_material:pvc-pipe'), 'pvc-pipe', pg_temp.reference_uuid('material_category:networks'), 'm', 1),
  (pg_temp.reference_uuid('catalog_material:hdpe-pipe'), 'hdpe-pipe', pg_temp.reference_uuid('material_category:networks'), 'm', 2),
  (pg_temp.reference_uuid('catalog_material:concrete-pipe'), 'concrete-pipe', pg_temp.reference_uuid('material_category:networks'), 'm', 3),
  (pg_temp.reference_uuid('catalog_material:manhole'), 'manhole', pg_temp.reference_uuid('material_category:networks'), 'piece', 4),
  (pg_temp.reference_uuid('catalog_material:tiles'), 'tiles', pg_temp.reference_uuid('material_category:finishes'), 'm2', 1),
  (pg_temp.reference_uuid('catalog_material:paint'), 'paint', pg_temp.reference_uuid('material_category:finishes'), 'l', 2),
  (pg_temp.reference_uuid('catalog_material:waterproofing'), 'waterproofing', pg_temp.reference_uuid('material_category:finishes'), 'm2', 3),
  (pg_temp.reference_uuid('catalog_material:formwork-timber'), 'formwork-timber', pg_temp.reference_uuid('material_category:site'), 'm3', 1),
  (pg_temp.reference_uuid('catalog_material:site-water'), 'site-water', pg_temp.reference_uuid('material_category:site'), 'm3', 2),
  (pg_temp.reference_uuid('catalog_material:nails'), 'nails', pg_temp.reference_uuid('material_category:site'), 'kg', 3);

INSERT INTO "public"."catalog_material_translations" ("material_id", "locale", "label") VALUES
  (pg_temp.reference_uuid('catalog_material:sand'), 'fr', 'Sable'),
  (pg_temp.reference_uuid('catalog_material:sand'), 'ar', 'رمل'),
  (pg_temp.reference_uuid('catalog_material:sand'), 'aeb', 'رمل'),
  (pg_temp.reference_uuid('catalog_material:sand'), 'aeb-Latn', 'Rmal'),
  (pg_temp.reference_uuid('catalog_material:gravel'), 'fr', 'Gravier'),
  (pg_temp.reference_uuid('catalog_material:gravel'), 'ar', 'حصى'),
  (pg_temp.reference_uuid('catalog_material:gravel'), 'aeb', 'حصى'),
  (pg_temp.reference_uuid('catalog_material:gravel'), 'aeb-Latn', '7ssé'),
  (pg_temp.reference_uuid('catalog_material:crushed-gravel'), 'fr', 'Gravier concassé'),
  (pg_temp.reference_uuid('catalog_material:crushed-gravel'), 'ar', 'حصى مكسّر'),
  (pg_temp.reference_uuid('catalog_material:crushed-gravel'), 'aeb', 'حصى مكسّر'),
  (pg_temp.reference_uuid('catalog_material:crushed-gravel'), 'aeb-Latn', '7ssé mkassar'),
  (pg_temp.reference_uuid('catalog_material:all-in-aggregate'), 'fr', 'Tout-venant'),
  (pg_temp.reference_uuid('catalog_material:all-in-aggregate'), 'ar', 'خليط حصوي'),
  (pg_temp.reference_uuid('catalog_material:all-in-aggregate'), 'aeb', 'توفونان'),
  (pg_temp.reference_uuid('catalog_material:all-in-aggregate'), 'aeb-Latn', 'Tout-venant'),
  (pg_temp.reference_uuid('catalog_material:tuff'), 'fr', 'Tuf'),
  (pg_temp.reference_uuid('catalog_material:tuff'), 'ar', 'طُفّ'),
  (pg_temp.reference_uuid('catalog_material:tuff'), 'aeb', 'تُف'),
  (pg_temp.reference_uuid('catalog_material:tuff'), 'aeb-Latn', 'Tuf'),
  (pg_temp.reference_uuid('catalog_material:rubble-stone'), 'fr', 'Moellons'),
  (pg_temp.reference_uuid('catalog_material:rubble-stone'), 'ar', 'حجارة البناء'),
  (pg_temp.reference_uuid('catalog_material:rubble-stone'), 'aeb', 'حجر'),
  (pg_temp.reference_uuid('catalog_material:rubble-stone'), 'aeb-Latn', '7jar'),
  (pg_temp.reference_uuid('catalog_material:fill-earth'), 'fr', 'Terre de remblai'),
  (pg_temp.reference_uuid('catalog_material:fill-earth'), 'ar', 'تراب الردم'),
  (pg_temp.reference_uuid('catalog_material:fill-earth'), 'aeb', 'تراب'),
  (pg_temp.reference_uuid('catalog_material:fill-earth'), 'aeb-Latn', 'Trab'),
  (pg_temp.reference_uuid('catalog_material:cement'), 'fr', 'Ciment'),
  (pg_temp.reference_uuid('catalog_material:cement'), 'ar', 'إسمنت'),
  (pg_temp.reference_uuid('catalog_material:cement'), 'aeb', 'سيمان'),
  (pg_temp.reference_uuid('catalog_material:cement'), 'aeb-Latn', 'Simen'),
  (pg_temp.reference_uuid('catalog_material:lime'), 'fr', 'Chaux'),
  (pg_temp.reference_uuid('catalog_material:lime'), 'ar', 'جير'),
  (pg_temp.reference_uuid('catalog_material:lime'), 'aeb', 'جير'),
  (pg_temp.reference_uuid('catalog_material:lime'), 'aeb-Latn', 'Jir'),
  (pg_temp.reference_uuid('catalog_material:plaster'), 'fr', 'Plâtre'),
  (pg_temp.reference_uuid('catalog_material:plaster'), 'ar', 'جبس'),
  (pg_temp.reference_uuid('catalog_material:plaster'), 'aeb', 'جبس'),
  (pg_temp.reference_uuid('catalog_material:plaster'), 'aeb-Latn', 'Jebs'),
  (pg_temp.reference_uuid('catalog_material:ready-mix-concrete'), 'fr', 'Béton prêt à l’emploi'),
  (pg_temp.reference_uuid('catalog_material:ready-mix-concrete'), 'ar', 'خرسانة جاهزة'),
  (pg_temp.reference_uuid('catalog_material:ready-mix-concrete'), 'aeb', 'بيتون جاهز'),
  (pg_temp.reference_uuid('catalog_material:ready-mix-concrete'), 'aeb-Latn', 'Béton jéhez'),
  (pg_temp.reference_uuid('catalog_material:rebar'), 'fr', 'Fer à béton'),
  (pg_temp.reference_uuid('catalog_material:rebar'), 'ar', 'حديد التسليح'),
  (pg_temp.reference_uuid('catalog_material:rebar'), 'aeb', 'حديد'),
  (pg_temp.reference_uuid('catalog_material:rebar'), 'aeb-Latn', '7did'),
  (pg_temp.reference_uuid('catalog_material:welded-mesh'), 'fr', 'Treillis soudé'),
  (pg_temp.reference_uuid('catalog_material:welded-mesh'), 'ar', 'شبكة حديد ملحومة'),
  (pg_temp.reference_uuid('catalog_material:welded-mesh'), 'aeb', 'تريّي'),
  (pg_temp.reference_uuid('catalog_material:welded-mesh'), 'aeb-Latn', 'Treillis'),
  (pg_temp.reference_uuid('catalog_material:binding-wire'), 'fr', 'Fil d’attache'),
  (pg_temp.reference_uuid('catalog_material:binding-wire'), 'ar', 'سلك الربط'),
  (pg_temp.reference_uuid('catalog_material:binding-wire'), 'aeb', 'فيل'),
  (pg_temp.reference_uuid('catalog_material:binding-wire'), 'aeb-Latn', 'Fil'),
  (pg_temp.reference_uuid('catalog_material:brick'), 'fr', 'Brique'),
  (pg_temp.reference_uuid('catalog_material:brick'), 'ar', 'آجر'),
  (pg_temp.reference_uuid('catalog_material:brick'), 'aeb', 'ياجور'),
  (pg_temp.reference_uuid('catalog_material:brick'), 'aeb-Latn', 'Yajour'),
  (pg_temp.reference_uuid('catalog_material:concrete-block'), 'fr', 'Parpaing'),
  (pg_temp.reference_uuid('catalog_material:concrete-block'), 'ar', 'طوب إسمنتي'),
  (pg_temp.reference_uuid('catalog_material:concrete-block'), 'aeb', 'بلوك'),
  (pg_temp.reference_uuid('catalog_material:concrete-block'), 'aeb-Latn', 'Bloc'),
  (pg_temp.reference_uuid('catalog_material:hollow-block'), 'fr', 'Hourdis'),
  (pg_temp.reference_uuid('catalog_material:hollow-block'), 'ar', 'هوردي'),
  (pg_temp.reference_uuid('catalog_material:hollow-block'), 'aeb', 'هوردي'),
  (pg_temp.reference_uuid('catalog_material:hollow-block'), 'aeb-Latn', 'Hourdis'),
  (pg_temp.reference_uuid('catalog_material:bitumen'), 'fr', 'Bitume'),
  (pg_temp.reference_uuid('catalog_material:bitumen'), 'ar', 'زفت'),
  (pg_temp.reference_uuid('catalog_material:bitumen'), 'aeb', 'زفت'),
  (pg_temp.reference_uuid('catalog_material:bitumen'), 'aeb-Latn', 'Zeft'),
  (pg_temp.reference_uuid('catalog_material:asphalt-mix'), 'fr', 'Enrobé bitumineux'),
  (pg_temp.reference_uuid('catalog_material:asphalt-mix'), 'ar', 'خليط إسفلتي'),
  (pg_temp.reference_uuid('catalog_material:asphalt-mix'), 'aeb', 'أونروبي'),
  (pg_temp.reference_uuid('catalog_material:asphalt-mix'), 'aeb-Latn', 'Enrobé'),
  (pg_temp.reference_uuid('catalog_material:bitumen-emulsion'), 'fr', 'Émulsion de bitume'),
  (pg_temp.reference_uuid('catalog_material:bitumen-emulsion'), 'ar', 'مستحلب إسفلتي'),
  (pg_temp.reference_uuid('catalog_material:bitumen-emulsion'), 'aeb', 'إيمولسيون'),
  (pg_temp.reference_uuid('catalog_material:bitumen-emulsion'), 'aeb-Latn', 'Émulsion'),
  (pg_temp.reference_uuid('catalog_material:kerb'), 'fr', 'Bordure de trottoir'),
  (pg_temp.reference_uuid('catalog_material:kerb'), 'ar', 'حافة الرصيف'),
  (pg_temp.reference_uuid('catalog_material:kerb'), 'aeb', 'بوردير'),
  (pg_temp.reference_uuid('catalog_material:kerb'), 'aeb-Latn', 'Bordure'),
  (pg_temp.reference_uuid('catalog_material:pvc-pipe'), 'fr', 'Tuyau PVC'),
  (pg_temp.reference_uuid('catalog_material:pvc-pipe'), 'ar', 'أنبوب بي في سي'),
  (pg_temp.reference_uuid('catalog_material:pvc-pipe'), 'aeb', 'تيو PVC'),
  (pg_temp.reference_uuid('catalog_material:pvc-pipe'), 'aeb-Latn', 'Tiyou PVC'),
  (pg_temp.reference_uuid('catalog_material:hdpe-pipe'), 'fr', 'Tuyau PEHD'),
  (pg_temp.reference_uuid('catalog_material:hdpe-pipe'), 'ar', 'أنبوب بولي إيثيلين'),
  (pg_temp.reference_uuid('catalog_material:hdpe-pipe'), 'aeb', 'تيو PEHD'),
  (pg_temp.reference_uuid('catalog_material:hdpe-pipe'), 'aeb-Latn', 'Tiyou PEHD'),
  (pg_temp.reference_uuid('catalog_material:concrete-pipe'), 'fr', 'Buse en béton'),
  (pg_temp.reference_uuid('catalog_material:concrete-pipe'), 'ar', 'أنبوب خرساني'),
  (pg_temp.reference_uuid('catalog_material:concrete-pipe'), 'aeb', 'بوز'),
  (pg_temp.reference_uuid('catalog_material:concrete-pipe'), 'aeb-Latn', 'Buse'),
  (pg_temp.reference_uuid('catalog_material:manhole'), 'fr', 'Regard préfabriqué'),
  (pg_temp.reference_uuid('catalog_material:manhole'), 'ar', 'غرفة تفتيش جاهزة'),
  (pg_temp.reference_uuid('catalog_material:manhole'), 'aeb', 'ريغار'),
  (pg_temp.reference_uuid('catalog_material:manhole'), 'aeb-Latn', 'Regard'),
  (pg_temp.reference_uuid('catalog_material:tiles'), 'fr', 'Carrelage'),
  (pg_temp.reference_uuid('catalog_material:tiles'), 'ar', 'بلاط'),
  (pg_temp.reference_uuid('catalog_material:tiles'), 'aeb', 'كاريلاج'),
  (pg_temp.reference_uuid('catalog_material:tiles'), 'aeb-Latn', 'Carrelage'),
  (pg_temp.reference_uuid('catalog_material:paint'), 'fr', 'Peinture'),
  (pg_temp.reference_uuid('catalog_material:paint'), 'ar', 'طلاء'),
  (pg_temp.reference_uuid('catalog_material:paint'), 'aeb', 'دهن'),
  (pg_temp.reference_uuid('catalog_material:paint'), 'aeb-Latn', 'Dhen'),
  (pg_temp.reference_uuid('catalog_material:waterproofing'), 'fr', 'Étanchéité'),
  (pg_temp.reference_uuid('catalog_material:waterproofing'), 'ar', 'عزل مائي'),
  (pg_temp.reference_uuid('catalog_material:waterproofing'), 'aeb', 'إيتانشيتي'),
  (pg_temp.reference_uuid('catalog_material:waterproofing'), 'aeb-Latn', 'Étanchéité'),
  (pg_temp.reference_uuid('catalog_material:formwork-timber'), 'fr', 'Bois de coffrage'),
  (pg_temp.reference_uuid('catalog_material:formwork-timber'), 'ar', 'خشب القوالب'),
  (pg_temp.reference_uuid('catalog_material:formwork-timber'), 'aeb', 'خشب كوفراج'),
  (pg_temp.reference_uuid('catalog_material:formwork-timber'), 'aeb-Latn', 'Khchab coffrage'),
  (pg_temp.reference_uuid('catalog_material:site-water'), 'fr', 'Eau de chantier'),
  (pg_temp.reference_uuid('catalog_material:site-water'), 'ar', 'ماء الحضيرة'),
  (pg_temp.reference_uuid('catalog_material:site-water'), 'aeb', 'ماء الشانتي'),
  (pg_temp.reference_uuid('catalog_material:site-water'), 'aeb-Latn', 'Ma el chantier'),
  (pg_temp.reference_uuid('catalog_material:nails'), 'fr', 'Pointes'),
  (pg_temp.reference_uuid('catalog_material:nails'), 'ar', 'مسامير'),
  (pg_temp.reference_uuid('catalog_material:nails'), 'aeb', 'مسمار'),
  (pg_temp.reference_uuid('catalog_material:nails'), 'aeb-Latn', 'Mosmar');
