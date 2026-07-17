import { IWorksiteCosts } from '../interfaces/worksite.interface';

/** A timesheet reduced to what the labor cost computation needs. */
export interface TimesheetCost {
  hoursWorked: number;
  hourlyRate: number;
}

/** An expense reduced to what the cost computation needs. */
export interface ExpenseCost {
  amount: number;
}

export interface CalculateActualCostInput {
  worksiteId: string;
  timesheets: TimesheetCost[];
  expenses: ExpenseCost[];
  totalBudget?: number | null;
}

/**
 * Labor cost = Σ (hoursWorked × hourlyRate).
 * See docs/03-architecture.md §5.
 */
export function calculateLaborCost(timesheets: TimesheetCost[]): number {
  return round(timesheets.reduce((total, t) => total + t.hoursWorked * t.hourlyRate, 0));
}

/** Expenses cost = Σ amount. */
export function calculateExpensesCost(expenses: ExpenseCost[]): number {
  return round(expenses.reduce((total, e) => total + e.amount, 0));
}

/**
 * Actual cost = labor cost + expenses cost.
 * Pure function, reused on the server (API) and on mobile (offline computation).
 */
export function calculateActualCost(input: CalculateActualCostInput): IWorksiteCosts {
  const laborCost = calculateLaborCost(input.timesheets);
  const expensesCost = calculateExpensesCost(input.expenses);
  const actualCost = round(laborCost + expensesCost);
  const totalBudget = input.totalBudget ?? null;

  return {
    worksiteId: input.worksiteId,
    laborCost,
    expensesCost,
    actualCost,
    totalBudget,
    variance: totalBudget === null ? null : round(totalBudget - actualCost),
  };
}

/** Monetary rounding to 2 decimals, resilient to floating-point drift. */
function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
