import { describe, expect, it } from 'vitest';
import { EquipmentCategory } from '../enums/equipment.enums';
import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_CODES,
  equipmentType,
  equipmentTypesOf,
} from './equipment-catalog';

describe('EQUIPMENT_TYPES', () => {
  it('never lists a code twice — a code is stored on every machine', () => {
    expect(new Set(EQUIPMENT_TYPE_CODES).size).toBe(EQUIPMENT_TYPE_CODES.length);
  });

  it('gives every category an "other" type, so no machine is left out', () => {
    for (const category of Object.values(EquipmentCategory)) {
      expect(equipmentTypesOf(category).map((type) => type.code)).toContain(`${category}_other`);
    }
  });

  it('gives every type a positive lifetime', () => {
    for (const type of EQUIPMENT_TYPES) {
      expect(type.defaultUsefulLifeMonths).toBeGreaterThan(0);
    }
  });

  it('depreciates public-works machines over five years, the Tunisian maximum rate', () => {
    expect(equipmentType('crawler_excavator')?.defaultUsefulLifeMonths).toBe(60);
    expect(equipmentType('site_hut')?.defaultUsefulLifeMonths).toBe(120);
    expect(equipmentType('nope')).toBeUndefined();
  });
});
