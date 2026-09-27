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

/**
 * A machine's stay on the worksite, reduced to its cost — the one stored on
 * the assignment, computed from the pricing agreed when it was made (see
 * `equipmentCostOverPeriod`). Never recomputed here at today's rates.
 */
export interface EquipmentAssignmentCost {
  cost: number;
}

export interface CalculateActualCostInput {
  worksiteId: string;
  timesheets: TimesheetCost[];
  expenses: ExpenseCost[];
  /** Absent means none — callers that predate equipment keep working. */
  equipment?: EquipmentAssignmentCost[];
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
 * Equipment cost = Σ of each assignment's stored cost.
 *
 * Each covers the **whole** assigned period, future days included: an
 * assignment is a commitment — the machine is booked, and its depreciation or
 * rent runs whether or not the days have passed yet. And each is priced at
 * what was agreed when it was made: a rental that goes up later does not
 * rewrite what past worksites cost.
 */
export function calculateEquipmentCost(assignments: EquipmentAssignmentCost[]): number {
  return round(assignments.reduce((total, a) => total + a.cost, 0));
}

/**
 * Actual cost = labor cost + expenses cost + equipment cost.
 * Pure function, reused on the server (API) and on mobile (offline computation).
 */
export function calculateActualCost(input: CalculateActualCostInput): IWorksiteCosts {
  const laborCost = calculateLaborCost(input.timesheets);
  const expensesCost = calculateExpensesCost(input.expenses);
  const equipmentCost = calculateEquipmentCost(input.equipment ?? []);
  const actualCost = round(laborCost + expensesCost + equipmentCost);
  const totalBudget = input.totalBudget ?? null;

  return {
    worksiteId: input.worksiteId,
    laborCost,
    expensesCost,
    equipmentCost,
    actualCost,
    totalBudget,
    variance: totalBudget === null ? null : round(totalBudget - actualCost),
  };
}

/** Monetary rounding to 2 decimals, resilient to floating-point drift. */
function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
