import { describe, expect, it } from 'vitest';
import { calculateActualCost, calculateExpensesCost, calculateLaborCost } from './worksite-costs';

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
