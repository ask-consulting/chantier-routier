import { describe, expect, it } from 'vitest';
import { AcquisitionMethod, EquipmentStatus } from '@chantia/shared';
import { CATALOG } from '@/test/equipment-catalog';
import { ACQUISITION_METHODS, EQUIPMENT_STATUSES, findType, labelOf } from './equipment-display';

describe('the catalog on screen', () => {
  it('speaks the reader’s language', () => {
    expect(labelOf(CATALOG[1], 'fr')).toBe('Compactage');
    expect(labelOf(CATALOG[1], 'ar')).toBe('الدمك');
  });

  it('finds a type across categories — and nothing while the catalog loads', () => {
    expect(findType(CATALOG, 'site_hut')?.defaultUsefulLifeMonths).toBe(120);
    expect(findType(CATALOG, 'spaceship')).toBeUndefined();
    expect(findType(undefined, 'site_hut')).toBeUndefined();
  });
});

describe('the display orders', () => {
  it('leave out no method or status', () => {
    expect([...ACQUISITION_METHODS].sort()).toEqual(Object.values(AcquisitionMethod).sort());
    expect([...EQUIPMENT_STATUSES].sort()).toEqual(Object.values(EquipmentStatus).sort());
  });
});
