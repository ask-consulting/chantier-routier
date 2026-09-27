import type { IEquipmentCategory } from '@chantia/shared';

/**
 * A slice of the equipment catalog, as `GET /equipment-catalog` serves it —
 * enough for the screens' tests, in both languages. The real one lives in the
 * database (migration `20260928080000_equipment_catalog`).
 */
export const CATALOG: IEquipmentCategory[] = [
  {
    code: 'earthmoving',
    labels: { fr: 'Terrassement', ar: 'تحريك التربة' },
    types: [
      {
        code: 'motor_grader',
        categoryCode: 'earthmoving',
        defaultUsefulLifeMonths: 60,
        labels: { fr: 'Niveleuse', ar: 'ممهدة (قريدر)' },
      },
      {
        code: 'earthmoving_other',
        categoryCode: 'earthmoving',
        defaultUsefulLifeMonths: 60,
        labels: { fr: 'Autre engin de terrassement', ar: 'آلة تحريك تربة أخرى' },
      },
    ],
  },
  {
    code: 'compaction',
    labels: { fr: 'Compactage', ar: 'الدمك' },
    types: [
      {
        code: 'tandem_roller',
        categoryCode: 'compaction',
        defaultUsefulLifeMonths: 60,
        labels: { fr: 'Compacteur tandem', ar: 'مدحلة ترادفية' },
      },
    ],
  },
  {
    code: 'site_equipment',
    labels: { fr: 'Matériel de chantier', ar: 'معدات الورش' },
    types: [
      {
        code: 'site_hut',
        categoryCode: 'site_equipment',
        defaultUsefulLifeMonths: 120,
        labels: { fr: 'Bungalow de chantier', ar: 'مكتب متنقل للورش' },
      },
    ],
  },
  {
    code: 'surveying',
    labels: { fr: 'Topographie', ar: 'المسح الطبوغرافي' },
    types: [
      {
        code: 'total_station',
        categoryCode: 'surveying',
        defaultUsefulLifeMonths: 80,
        labels: { fr: 'Station totale', ar: 'محطة مسح شاملة' },
      },
    ],
  },
];
