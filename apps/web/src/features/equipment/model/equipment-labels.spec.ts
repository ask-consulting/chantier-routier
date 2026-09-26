import { describe, expect, it } from 'vitest';
import {
  AcquisitionMethod,
  EQUIPMENT_TYPE_CODES,
  EquipmentCategory,
  EquipmentStatus,
} from '@chantia/shared';
import ar from '../../../../messages/ar.json';
import fr from '../../../../messages/fr.json';
import { ACQUISITION_METHODS, EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES } from './equipment-display';

/**
 * The catalog is code, its labels are translations — two files that must
 * agree. A code added to `EQUIPMENT_TYPES` without its labels would show its
 * raw identifier in a list; this is where that is caught, in both languages.
 */

const bundles = { fr, ar } as const;

describe.each(Object.entries(bundles))('the %s labels', (_, messages) => {
  it('name every equipment type of the catalog', () => {
    for (const code of EQUIPMENT_TYPE_CODES) {
      expect(messages.equipmentType, code).toHaveProperty(code);
    }
  });

  it('name every category, acquisition method and status', () => {
    for (const category of Object.values(EquipmentCategory)) {
      expect(messages.equipmentCategory).toHaveProperty(category);
    }
    for (const method of Object.values(AcquisitionMethod)) {
      expect(messages.acquisitionMethod).toHaveProperty(method);
    }
    for (const status of Object.values(EquipmentStatus)) {
      expect(messages.equipmentStatus).toHaveProperty(status);
    }
  });

  it('name nothing the catalog does not have', () => {
    expect(Object.keys(messages.equipmentType).sort()).toEqual([...EQUIPMENT_TYPE_CODES].sort());
  });
});

describe('the display orders', () => {
  it('leave out no category, method or status', () => {
    expect([...EQUIPMENT_CATEGORIES].sort()).toEqual(Object.values(EquipmentCategory).sort());
    expect([...ACQUISITION_METHODS].sort()).toEqual(Object.values(AcquisitionMethod).sort());
    expect([...EQUIPMENT_STATUSES].sort()).toEqual(Object.values(EquipmentStatus).sort());
  });
});
