-- The equipment catalog moves from code (`EQUIPMENT_TYPES` in @chantia/shared)
-- into the database: categories and types become rows, with their French and
-- Arabic labels, and `equipment.type_code` gets a real foreign key.
--
-- Global tables — no `organization_id`, so the tenant filter leaves them alone —
-- written only by migrations: an organization picks a type, it never edits the
-- list. Every category ends with an "other" type (sort order 990), so no
-- machine is left out.
--
-- Default lifetimes follow the Tunisian maximum straight-line rates
-- (décret n° 2008-492): public-works equipment and road vehicles 20 % a year,
-- hence 60 months; general equipment and tools 15 %, hence 80; light
-- constructions 10 %, hence 120.

CREATE TABLE "public"."equipment_categories" (
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "pk_equipment_categories" PRIMARY KEY ("code")
);

CREATE TABLE "public"."equipment_types" (
    "code" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "default_useful_life_months" INTEGER NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "pk_equipment_types" PRIMARY KEY ("code"),
    CONSTRAINT "ck_equipment_types_default_useful_life_months" CHECK ("default_useful_life_months" > 0)
);

CREATE INDEX "ix_equipment_types_category_code" ON "public"."equipment_types"("category_code");

ALTER TABLE "public"."equipment_types"
  ADD CONSTRAINT "fk_equipment_types_equipment_categories" FOREIGN KEY ("category_code")
  REFERENCES "public"."equipment_categories"("code") ON DELETE NO ACTION ON UPDATE CASCADE;

INSERT INTO "public"."equipment_categories" ("code", "label_fr", "label_ar", "sort_order") VALUES
  ('earthmoving', 'Terrassement', 'تحريك التربة', 10),
  ('compaction', 'Compactage', 'الدمك', 20),
  ('paving', 'Chaussée et enrobés', 'الرصف والإسفلت', 30),
  ('concrete', 'Béton', 'الخرسانة', 40),
  ('transport', 'Transport', 'النقل', 50),
  ('lifting', 'Levage', 'الرفع', 60),
  ('drilling_breaking', 'Forage et démolition', 'الحفر والهدم', 70),
  ('signage', 'Signalisation', 'التشوير', 80),
  ('site_equipment', 'Matériel de chantier', 'معدات الورش', 90),
  ('surveying', 'Topographie', 'المسح الطبوغرافي', 100),
  ('light_vehicle', 'Véhicules légers', 'المركبات الخفيفة', 110);

INSERT INTO "public"."equipment_types" ("code", "category_code", "default_useful_life_months", "label_fr", "label_ar", "sort_order") VALUES
  ('crawler_excavator', 'earthmoving', 60, 'Pelle hydraulique sur chenilles', 'حفارة هيدروليكية مجنزرة', 10),
  ('wheeled_excavator', 'earthmoving', 60, 'Pelle hydraulique sur pneus', 'حفارة هيدروليكية على عجلات', 20),
  ('mini_excavator', 'earthmoving', 60, 'Mini-pelle', 'حفارة صغيرة', 30),
  ('backhoe_loader', 'earthmoving', 60, 'Tractopelle', 'جرافة حفارة (تراكتوبال)', 40),
  ('wheel_loader', 'earthmoving', 60, 'Chargeuse sur pneus', 'جرافة على عجلات', 50),
  ('track_loader', 'earthmoving', 60, 'Chargeuse sur chenilles', 'جرافة مجنزرة', 60),
  ('skid_steer_loader', 'earthmoving', 60, 'Chargeuse compacte (skid steer)', 'جرافة صغيرة (سكيد ستير)', 70),
  ('bulldozer', 'earthmoving', 60, 'Bouteur (bulldozer)', 'بلدوزر', 80),
  ('motor_grader', 'earthmoving', 60, 'Niveleuse', 'ممهدة (قريدر)', 90),
  ('scraper', 'earthmoving', 60, 'Décapeuse (scraper)', 'كاشطة', 100),
  ('articulated_dump_truck', 'earthmoving', 60, 'Tombereau articulé', 'قلابة مفصلية', 110),
  ('rigid_dump_truck', 'earthmoving', 60, 'Tombereau rigide', 'قلابة صلبة', 120),
  ('trencher', 'earthmoving', 60, 'Trancheuse', 'آلة حفر الخنادق', 130),
  ('earthmoving_other', 'earthmoving', 60, 'Autre engin de terrassement', 'آلة تحريك تربة أخرى', 990),
  ('single_drum_roller', 'compaction', 60, 'Compacteur monocylindre vibrant', 'مدحلة اهتزازية أحادية الأسطوانة', 10),
  ('tandem_roller', 'compaction', 60, 'Compacteur tandem', 'مدحلة ترادفية', 20),
  ('pneumatic_roller', 'compaction', 60, 'Compacteur à pneus', 'مدحلة بعجلات مطاطية', 30),
  ('padfoot_roller', 'compaction', 60, 'Compacteur à pieds de mouton', 'مدحلة بأقدام الغنم', 40),
  ('combination_roller', 'compaction', 60, 'Compacteur mixte', 'مدحلة مختلطة', 50),
  ('plate_compactor', 'compaction', 60, 'Plaque vibrante', 'صفيحة اهتزازية', 60),
  ('rammer', 'compaction', 60, 'Pilonneuse', 'دكاكة', 70),
  ('compaction_other', 'compaction', 60, 'Autre matériel de compactage', 'معدّة دمك أخرى', 990),
  ('asphalt_paver', 'paving', 60, 'Finisseur', 'آلة فرش الإسفلت', 10),
  ('cold_milling_machine', 'paving', 60, 'Raboteuse (fraiseuse)', 'آلة كشط الطريق', 20),
  ('bitumen_distributor', 'paving', 60, 'Répandeuse de liant', 'موزعة الزفت', 30),
  ('chip_spreader', 'paving', 60, 'Gravillonneur', 'موزعة الحصى', 40),
  ('soil_stabilizer', 'paving', 60, 'Stabilisateur / recycleur', 'آلة تثبيت التربة / إعادة التدوير', 50),
  ('binder_spreader', 'paving', 60, 'Épandeur de liant (chaux, ciment)', 'موزعة المواد الرابطة (جير، إسمنت)', 60),
  ('asphalt_plant', 'paving', 60, 'Centrale d’enrobage', 'محطة خلط الإسفلت', 70),
  ('road_sweeper', 'paving', 60, 'Balayeuse', 'كانسة طرق', 80),
  ('paving_other', 'paving', 60, 'Autre matériel de chaussée', 'معدّة رصف أخرى', 990),
  ('concrete_mixer_truck', 'concrete', 60, 'Camion malaxeur (toupie)', 'شاحنة خلط الخرسانة', 10),
  ('concrete_pump', 'concrete', 60, 'Pompe à béton', 'مضخة خرسانة', 20),
  ('concrete_mixer', 'concrete', 60, 'Bétonnière', 'خلاطة خرسانة', 30),
  ('slipform_paver', 'concrete', 60, 'Machine à coffrage glissant', 'آلة القوالب المنزلقة', 40),
  ('concrete_other', 'concrete', 60, 'Autre matériel à béton', 'معدّة خرسانة أخرى', 990),
  ('dump_truck', 'transport', 60, 'Camion benne', 'شاحنة قلابة', 10),
  ('tipper_semi_trailer', 'transport', 60, 'Semi-remorque benne', 'نصف مقطورة قلابة', 20),
  ('lowbed_trailer', 'transport', 60, 'Porte-engins', 'ناقلة آليات', 30),
  ('tractor_unit', 'transport', 60, 'Tracteur routier', 'جرار طرقي', 40),
  ('water_tanker', 'transport', 60, 'Camion citerne à eau', 'صهريج ماء', 50),
  ('fuel_tanker', 'transport', 60, 'Camion citerne à carburant', 'صهريج وقود', 60),
  ('flatbed_truck', 'transport', 60, 'Camion plateau', 'شاحنة مسطحة', 70),
  ('transport_other', 'transport', 60, 'Autre véhicule de transport', 'مركبة نقل أخرى', 990),
  ('mobile_crane', 'lifting', 60, 'Grue mobile', 'رافعة متنقلة', 10),
  ('telehandler', 'lifting', 60, 'Chariot télescopique', 'رافعة تلسكوبية', 20),
  ('forklift', 'lifting', 60, 'Chariot élévateur', 'رافعة شوكية', 30),
  ('aerial_platform', 'lifting', 60, 'Nacelle élévatrice', 'منصة رفع', 40),
  ('lifting_other', 'lifting', 60, 'Autre engin de levage', 'آلة رفع أخرى', 990),
  ('hydraulic_breaker', 'drilling_breaking', 60, 'Brise-roche hydraulique', 'كسارة صخور هيدروليكية', 10),
  ('drilling_rig', 'drilling_breaking', 60, 'Foreuse', 'آلة حفر', 20),
  ('jackhammer', 'drilling_breaking', 60, 'Marteau-piqueur', 'مطرقة هوائية', 30),
  ('floor_saw', 'drilling_breaking', 60, 'Scie à sol', 'منشار أرضيات', 40),
  ('drilling_breaking_other', 'drilling_breaking', 60, 'Autre matériel de forage ou de démolition', 'معدّة حفر أو هدم أخرى', 990),
  ('road_marking_machine', 'signage', 80, 'Machine de marquage routier', 'آلة تخطيط الطرق', 10),
  ('arrow_board_trailer', 'signage', 80, 'Flèche lumineuse de rabattement', 'سهم ضوئي للتحويل', 20),
  ('temporary_traffic_lights', 'signage', 80, 'Feux de chantier', 'إشارات ضوئية للورش', 30),
  ('signage_other', 'signage', 80, 'Autre matériel de signalisation', 'معدّة تشوير أخرى', 990),
  ('generator', 'site_equipment', 80, 'Groupe électrogène', 'مولد كهربائي', 10),
  ('air_compressor', 'site_equipment', 80, 'Compresseur', 'ضاغط هواء', 20),
  ('water_pump', 'site_equipment', 80, 'Motopompe', 'مضخة ماء', 30),
  ('lighting_tower', 'site_equipment', 80, 'Mât d’éclairage', 'برج إنارة', 40),
  ('welding_machine', 'site_equipment', 80, 'Poste à souder', 'آلة لحام', 50),
  ('fuel_tank', 'site_equipment', 80, 'Cuve à carburant', 'خزان وقود', 60),
  ('site_equipment_other', 'site_equipment', 80, 'Autre matériel de chantier', 'معدّة ورش أخرى', 990),
  ('site_hut', 'site_equipment', 120, 'Bungalow de chantier', 'مكتب متنقل للورش', 80),
  ('total_station', 'surveying', 80, 'Station totale', 'محطة مسح شاملة', 10),
  ('gnss_receiver', 'surveying', 80, 'Récepteur GNSS (GPS RTK)', 'مستقبل GNSS (GPS RTK)', 20),
  ('laser_level', 'surveying', 80, 'Niveau laser', 'ميزان ليزر', 30),
  ('surveying_other', 'surveying', 80, 'Autre matériel de topographie', 'معدّة مسح أخرى', 990),
  ('pickup', 'light_vehicle', 60, 'Pick-up', 'بيك آب', 10),
  ('van', 'light_vehicle', 60, 'Fourgon', 'شاحنة صغيرة (فورغون)', 20),
  ('car', 'light_vehicle', 60, 'Véhicule de liaison', 'سيارة خدمة', 30),
  ('light_vehicle_other', 'light_vehicle', 60, 'Autre véhicule léger', 'مركبة خفيفة أخرى', 990);

-- Every machine recorded so far went through the API's allow-list of these
-- very codes, so the key holds on existing rows.
ALTER TABLE "public"."equipment"
  ADD CONSTRAINT "fk_equipment_equipment_types" FOREIGN KEY ("type_code")
  REFERENCES "public"."equipment_types"("code") ON DELETE NO ACTION ON UPDATE CASCADE;
