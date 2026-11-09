import type { IEquipmentCategory } from '@chantia/shared';

/**
 * A slice of the equipment catalog, as `GET /equipment-catalog` serves it —
 * enough for the screens' tests, in both languages. The real one lives in the
 * database (migration `20260928080000_equipment_catalog`).
 */
export const CATALOG: IEquipmentCategory[] = [
  {
    id: 'earthmoving',
    code: 'earthmoving',
    labels: { fr: 'Terrassement', ar: 'تحريك التربة' },
    types: [
      {
        id: 'motor_grader',
        code: 'motor_grader',
        categoryId: 'earthmoving',
        defaultUsefulLifeMonths: 60,
        labels: { fr: 'Niveleuse', ar: 'ممهدة (قريدر)' },
      },
      {
        id: 'earthmoving_other',
        code: 'earthmoving_other',
        categoryId: 'earthmoving',
        defaultUsefulLifeMonths: 60,
        labels: { fr: 'Autre engin de terrassement', ar: 'آلة تحريك تربة أخرى' },
      },
    ],
  },
  {
    id: 'compaction',
    code: 'compaction',
    labels: { fr: 'Compactage', ar: 'الدمك' },
    types: [
      {
        id: 'tandem_roller',
        code: 'tandem_roller',
        categoryId: 'compaction',
        defaultUsefulLifeMonths: 60,
        labels: { fr: 'Compacteur tandem', ar: 'مدحلة ترادفية' },
      },
    ],
  },
  {
    id: 'site_equipment',
    code: 'site_equipment',
    labels: { fr: 'Matériel de chantier', ar: 'معدات الورش' },
    types: [
      {
        id: 'site_hut',
        code: 'site_hut',
        categoryId: 'site_equipment',
        defaultUsefulLifeMonths: 120,
        labels: { fr: 'Bungalow de chantier', ar: 'مكتب متنقل للورش' },
      },
    ],
  },
  {
    id: 'surveying',
    code: 'surveying',
    labels: { fr: 'Topographie', ar: 'المسح الطبوغرافي' },
    types: [
      {
        id: 'total_station',
        code: 'total_station',
        categoryId: 'surveying',
        defaultUsefulLifeMonths: 80,
        labels: { fr: 'Station totale', ar: 'محطة مسح شاملة' },
      },
    ],
  },
];
