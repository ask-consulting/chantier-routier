import { describe, expect, it } from 'vitest';
import { AcquisitionMethod } from '../enums/equipment.enums';
import {
  addMonths,
  daysBetweenInclusive,
  depreciationEndDate,
  equipmentCostOverPeriod,
  equipmentDailyCost,
  netBookValue,
  type EquipmentCostInput,
} from './equipment-costs';

/** Bought 2026-01-01 for 365 000 over 12 months, nothing residual: 1 000 a day. */
const excavator: EquipmentCostInput = {
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2026-01-01',
  purchasePrice: 365_000,
  usefulLifeMonths: 12,
};

describe('calendar arithmetic', () => {
  it('counts both ends', () => {
    expect(daysBetweenInclusive('2026-03-01', '2026-03-10')).toBe(10);
    expect(daysBetweenInclusive('2026-03-10', '2026-03-01')).toBe(0);
  });

  it('clamps a month to its last day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('ignores a time part', () => {
    expect(daysBetweenInclusive('2026-03-01T00:00:00.000Z', '2026-03-02')).toBe(2);
  });
});

describe('an owned machine', () => {
  it('is depreciated until the day before its anniversary', () => {
    expect(depreciationEndDate(excavator)).toBe('2026-12-31');
    expect(depreciationEndDate({ ...excavator, usefulLifeMonths: 60 })).toBe('2030-12-31');
  });

  it('costs its depreciation per calendar day, and nothing outside the period', () => {
    expect(equipmentDailyCost(excavator, '2026-06-15')).toBeCloseTo(1_000);
    expect(equipmentDailyCost(excavator, '2025-12-31')).toBe(0);
    expect(equipmentDailyCost(excavator, '2027-01-01')).toBe(0);
  });

  it('keeps the residual value out of the depreciation', () => {
    const withResidual = { ...excavator, residualValue: 36_500 };

    expect(equipmentDailyCost(withResidual, '2026-06-15')).toBeCloseTo(900);
  });

  it('bought on credit, wears out at the same rate', () => {
    expect(
      equipmentDailyCost(
        { ...excavator, acquisitionMethod: AcquisitionMethod.CREDIT_PURCHASE },
        '2026-06-15',
      ),
    ).toBeCloseTo(1_000);
  });

  it('costs nothing after it is disposed of', () => {
    const sold = { ...excavator, disposalDate: '2026-06-30' };

    expect(equipmentDailyCost(sold, '2026-06-30')).toBeCloseTo(1_000);
    expect(equipmentDailyCost(sold, '2026-07-01')).toBe(0);
  });

  it('adds up to the whole depreciable amount over its life', () => {
    expect(equipmentCostOverPeriod(excavator, '2025-01-01', '2027-12-31')).toBe(365_000);
  });

  it('costs nothing without a price or a lifetime', () => {
    expect(equipmentDailyCost({ ...excavator, purchasePrice: null }, '2026-06-15')).toBe(0);
    expect(depreciationEndDate({ ...excavator, usefulLifeMonths: null })).toBeNull();
  });

  it('loses book value day by day, down to its residual value', () => {
    const withResidual = { ...excavator, residualValue: 36_500 };

    expect(netBookValue(excavator, '2025-06-01')).toBe(365_000);
    expect(netBookValue(excavator, '2026-01-10')).toBe(355_000);
    expect(netBookValue(withResidual, '2030-01-01')).toBe(36_500);
    expect(netBookValue({ ...excavator, usefulLifeMonths: null }, '2026-06-01')).toBe(365_000);
  });
});

describe('a leased or rented machine', () => {
  const leased: EquipmentCostInput = {
    acquisitionMethod: AcquisitionMethod.LEASING,
    acquisitionDate: '2026-01-01',
    monthlyPayment: 3_650,
    contractEndDate: '2026-12-31',
  };

  it('costs its monthly payment spread over the year, for the contract', () => {
    expect(equipmentDailyCost(leased, '2026-06-15')).toBeCloseTo(120);
    expect(equipmentDailyCost(leased, '2027-01-01')).toBe(0);
    expect(
      equipmentDailyCost({ ...leased, acquisitionMethod: AcquisitionMethod.LONG_TERM_RENTAL }, '2026-06-15'),
    ).toBeCloseTo(120);
  });

  it('has no book value — it is not the organization’s', () => {
    expect(netBookValue(leased, '2026-06-15')).toBeNull();
    expect(depreciationEndDate(leased)).toBeNull();
  });

  it('hired short-term, costs its daily rate, open-ended when no end is set', () => {
    const hired: EquipmentCostInput = {
      acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
      acquisitionDate: '2026-03-01',
      dailyRate: 450,
    };

    expect(equipmentCostOverPeriod(hired, '2026-03-01', '2026-03-10')).toBe(4_500);
    expect(equipmentDailyCost({ ...hired, contractEndDate: '2026-03-05' }, '2026-03-06')).toBe(0);
    expect(equipmentDailyCost({ ...hired, dailyRate: null }, '2026-03-02')).toBe(0);
  });

  it('counts only the days a period shares with the contract', () => {
    expect(equipmentCostOverPeriod(leased, '2026-12-25', '2027-01-05')).toBeCloseTo(120 * 7, 3);
  });
});
