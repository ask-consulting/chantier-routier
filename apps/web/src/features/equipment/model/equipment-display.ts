import {
  AcquisitionMethod,
  EquipmentStatus,
  translated,
  type IEquipmentCategory,
  type IEquipmentType,
} from '@chantia/shared';
import type { Tone } from '@/shared/ui';

/**
 * How equipment reads on screen. Status and method labels live in
 * `messages/*.json`; the catalog's labels come with the catalog, from the
 * database, in every language it has — see `labelOf`. Tones and orders live here.
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

export const ACQUISITION_METHODS: readonly AcquisitionMethod[] = [
  AcquisitionMethod.CASH_PURCHASE,
  AcquisitionMethod.CREDIT_PURCHASE,
  AcquisitionMethod.LEASING,
  AcquisitionMethod.LONG_TERM_RENTAL,
  AcquisitionMethod.SHORT_TERM_RENTAL,
];

/**
 * A catalog entry's label in the reader's language — else French, else its
 * code. The catalog's languages live in the database and may run ahead of, or
 * behind, the ones this interface speaks.
 */
export function labelOf(entry: IEquipmentCategory | IEquipmentType, locale: string): string {
  return translated(entry.labels, locale, entry.code);
}

/** A type of the catalog by its code, or `undefined` while it loads or for an unknown code. */
export function findType(
  catalog: readonly IEquipmentCategory[] | undefined,
  code: string,
): IEquipmentType | undefined {
  for (const category of catalog ?? []) {
    const type = category.types.find((candidate) => candidate.code === code);
    if (type) {
      return type;
    }
  }
  return undefined;
}
