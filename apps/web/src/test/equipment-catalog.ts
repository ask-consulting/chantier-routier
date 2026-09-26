import type { IEquipmentCategory } from '@chantia/shared';

/**
 * A slice of the equipment catalog, as `GET /equipment-catalog` serves it —
 * enough for the screens' tests, in both languages. The real one lives in the
 * database (migration `20260928080000_equipment_catalog`).
 */
export const CATALOG: IEquipmentCategory[] = [
  {
    code: 'earthmoving',
    labelFr: 'Terrassement',
    labelAr: 'تحريك التربة',
    types: [
      {
        code: 'motor_grader',
        categoryCode: 'earthmoving',
        defaultUsefulLifeMonths: 60,
        labelFr: 'Niveleuse',
        labelAr: 'ممهدة (قريدر)',
      },
      {
        code: 'earthmoving_other',
        categoryCode: 'earthmoving',
        defaultUsefulLifeMonths: 60,
        labelFr: 'Autre engin de terrassement',
        labelAr: 'آلة تحريك تربة أخرى',
      },
    ],
  },
  {
    code: 'compaction',
    labelFr: 'Compactage',
    labelAr: 'الدمك',
    types: [
      {
        code: 'tandem_roller',
        categoryCode: 'compaction',
        defaultUsefulLifeMonths: 60,
        labelFr: 'Compacteur tandem',
        labelAr: 'مدحلة ترادفية',
      },
    ],
  },
  {
    code: 'site_equipment',
    labelFr: 'Matériel de chantier',
    labelAr: 'معدات الورش',
    types: [
      {
        code: 'site_hut',
        categoryCode: 'site_equipment',
        defaultUsefulLifeMonths: 120,
        labelFr: 'Bungalow de chantier',
        labelAr: 'مكتب متنقل للورش',
      },
    ],
  },
  {
    code: 'surveying',
    labelFr: 'Topographie',
    labelAr: 'المسح الطبوغرافي',
    types: [
      {
        code: 'total_station',
        categoryCode: 'surveying',
        defaultUsefulLifeMonths: 80,
        labelFr: 'Station totale',
        labelAr: 'محطة مسح شاملة',
      },
    ],
  },
];
