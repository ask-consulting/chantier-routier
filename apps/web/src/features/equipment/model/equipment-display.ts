import { AcquisitionMethod, EquipmentCategory, EquipmentStatus } from '@chantia/shared';
import type { Tone } from '@/shared/ui';

/**
 * How equipment reads on screen. Labels live in `messages/*.json`
 * (`equipmentType.*`, `equipmentCategory.*`, `acquisitionMethod.*`,
 * `equipmentStatus.*`); tones and orders live here.
 */

export const EQUIPMENT_STATUS_TONE: Record<EquipmentStatus, Tone> = {
  [EquipmentStatus.IN_SERVICE]: 'success',
  // Signal, not danger: a machine in the workshop needs attention, it is not lost.
  [EquipmentStatus.UNDER_MAINTENANCE]: 'signal',
  [EquipmentStatus.RETIRED]: 'neutral',
};

export const EQUIPMENT_STATUSES: readonly EquipmentStatus[] = [
  EquipmentStatus.IN_SERVICE,
  EquipmentStatus.UNDER_MAINTENANCE,
  EquipmentStatus.RETIRED,
];

/** The catalog's categories, in the order a road works fleet is read. */
export const EQUIPMENT_CATEGORIES: readonly EquipmentCategory[] = [
  EquipmentCategory.EARTHMOVING,
  EquipmentCategory.COMPACTION,
  EquipmentCategory.PAVING,
  EquipmentCategory.CONCRETE,
  EquipmentCategory.TRANSPORT,
  EquipmentCategory.LIFTING,
  EquipmentCategory.DRILLING_BREAKING,
  EquipmentCategory.SIGNAGE,
  EquipmentCategory.SITE_EQUIPMENT,
  EquipmentCategory.SURVEYING,
  EquipmentCategory.LIGHT_VEHICLE,
];

export const ACQUISITION_METHODS: readonly AcquisitionMethod[] = [
  AcquisitionMethod.CASH_PURCHASE,
  AcquisitionMethod.CREDIT_PURCHASE,
  AcquisitionMethod.LEASING,
  AcquisitionMethod.LONG_TERM_RENTAL,
  AcquisitionMethod.SHORT_TERM_RENTAL,
];
