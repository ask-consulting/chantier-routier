import { describe, expect, it } from 'vitest';
import { AcquisitionMethod } from '../enums/equipment.enums';
import {
  calculateActualCost,
  calculateEquipmentCost,
  calculateExpensesCost,
  calculateLaborCost,
} from './worksite-costs';

describe('calculateLaborCost', () => {
  it('sums hoursWorked × hourlyRate', () => {
    expect(
      calculateLaborCost([
        { hoursWorked: 8, hourlyRate: 20 },
        { hoursWorked: 4, hourlyRate: 25 },
      ]),
    ).toBe(260);
  });

  it('returns 0 with no timesheet', () => {
    expect(calculateLaborCost([])).toBe(0);
  });
});

describe('calculateExpensesCost', () => {
  it('sums amounts', () => {
    expect(calculateExpensesCost([{ amount: 100.5 }, { amount: 49.5 }])).toBe(150);
  });
});

describe('calculateActualCost', () => {
  it('adds labor and expenses and computes budget variance', () => {
    const result = calculateActualCost({
      worksiteId: 'w1',
      timesheets: [{ hoursWorked: 10, hourlyRate: 20 }],
      expenses: [{ amount: 300 }],
      totalBudget: 1000,
    });

    expect(result.laborCost).toBe(200);
    expect(result.expensesCost).toBe(300);
    expect(result.actualCost).toBe(500);
    expect(result.variance).toBe(500);
  });

  it('returns a null variance when there is no budget', () => {
    const result = calculateActualCost({
      worksiteId: 'w1',
      timesheets: [],
      expenses: [],
    });
    expect(result.totalBudget).toBeNull();
    expect(result.variance).toBeNull();
  });

  it('detects a budget overrun (negative variance)', () => {
    const result = calculateActualCost({
      worksiteId: 'w1',
      timesheets: [{ hoursWorked: 100, hourlyRate: 30 }],
      expenses: [{ amount: 500 }],
      totalBudget: 1000,
    });
    expect(result.actualCost).toBe(3500);
    expect(result.variance).toBe(-2500);
  });
});

describe('the equipment in a worksite’s cost', () => {
  const excavator = {
    acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
    acquisitionDate: '2026-01-01',
    purchasePrice: 365_000,
    usefulLifeMonths: 12,
  };
  const hired = {
    acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
    acquisitionDate: '2026-03-01',
    dailyRate: 450,
  };

  it('sums every machine over its whole assigned period', () => {
    expect(
      calculateEquipmentCost([
        { equipment: excavator, startDate: '2026-03-01', endDate: '2026-03-10' },
        { equipment: hired, startDate: '2026-03-01', endDate: '2026-03-02' },
      ]),
    ).toBe(10_900);
  });

  it('adds up with labour and expenses, against the budget', () => {
    const costs = calculateActualCost({
      worksiteId: 'w-1',
      timesheets: [{ hoursWorked: 10, hourlyRate: 20 }],
      expenses: [{ amount: 300 }],
      equipment: [{ equipment: hired, startDate: '2026-03-01', endDate: '2026-03-02' }],
      totalBudget: 2_000,
    });

    expect(costs.equipmentCost).toBe(900);
    expect(costs.actualCost).toBe(1_400);
    expect(costs.variance).toBe(600);
  });

  it('counts no equipment when none is given', () => {
    expect(
      calculateActualCost({ worksiteId: 'w-1', timesheets: [], expenses: [] }).equipmentCost,
    ).toBe(0);
  });
});
