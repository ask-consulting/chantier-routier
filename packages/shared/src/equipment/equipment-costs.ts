import { AcquisitionMethod } from '../enums/equipment.enums';

/**
 * What a machine costs per day, and over a period — pure functions, shared so
 * the API, the web preview and the offline mobile app compute the same figure.
 *
 * **Calendar days, not working days.** Depreciation runs every day whether the
 * machine works or not; a machine assigned from the 1st to the 10th costs ten
 * days. That is the actual cost of keeping it, and it adds up to the
 * accounting depreciation exactly.
 *
 * **Dates are `YYYY-MM-DD` strings**, compared and counted in UTC. A planned
 * day is a day, not an instant — the same reasoning as a worksite's dates.
 */

export interface EquipmentCostInput {
  acquisitionMethod: AcquisitionMethod;
  /** First day it is the organization's to use — and to pay for. */
  acquisitionDate: string;
  /** Owned only: price excluding tax. */
  purchasePrice?: number | null;
  /** Owned only: what it is expected to be worth at the end. `0` when absent. */
  residualValue?: number | null;
  /** Owned only: straight-line depreciation period. */
  usefulLifeMonths?: number | null;
  /** Leasing and long-term rental. */
  monthlyPayment?: number | null;
  /** Short-term rental. */
  dailyRate?: number | null;
  /** Leasing and rentals: last day of the contract, inclusive. Open-ended when absent. */
  contractEndDate?: string | null;
  /** Sold, scrapped or returned: nothing is owed for the days after it. */
  disposalDate?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` (a time part is ignored) as its three numbers. */
function parts(day: string): [number, number, number] {
  const [year = NaN, month = NaN, date = NaN] = day.slice(0, 10).split('-').map(Number);
  return [year, month, date];
}

function toUtc(day: string): number {
  const [year, month, date] = parts(day);
  return Date.UTC(year, month - 1, date);
}

function fromUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both included. `0` when `to` is before `from`. */
export function daysBetweenInclusive(from: string, to: string): number {
  return Math.max(0, Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1);
}

/** The day after `day`. */
function nextDay(day: string): string {
  return fromUtc(toUtc(day) + DAY_MS);
}

/**
 * `months` calendar months after `day`, clamped to the end of the target
 * month: 31 January plus one month is the last day of February.
 */
export function addMonths(day: string, months: number): string {
  const [year, month, date] = parts(day);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastOfMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date, lastOfMonth));
  return fromUtc(target.getTime());
}

export function isOwned(method: AcquisitionMethod): boolean {
  return method === AcquisitionMethod.CASH_PURCHASE || method === AcquisitionMethod.CREDIT_PURCHASE;
}

/**
 * Last day of depreciation, inclusive — bought on 2026-01-01 over 60 months,
 * fully depreciated on 2030-12-31. `null` for what is not owned, or when the
 * lifetime is unknown.
 */
export function depreciationEndDate(equipment: EquipmentCostInput): string | null {
  if (!isOwned(equipment.acquisitionMethod) || !equipment.usefulLifeMonths) {
    return null;
  }
  const end = addMonths(equipment.acquisitionDate, equipment.usefulLifeMonths);
  return fromUtc(toUtc(end) - DAY_MS);
}

/** What one day of depreciation is worth, over the whole period. */
function depreciationPerDay(equipment: EquipmentCostInput): number {
  const end = depreciationEndDate(equipment);
  if (end === null || !equipment.purchasePrice) {
    return 0;
  }
  const depreciable = Math.max(0, equipment.purchasePrice - (equipment.residualValue ?? 0));
  return depreciable / daysBetweenInclusive(equipment.acquisitionDate, end);
}

/**
 * What the machine costs on one calendar day.
 *
 *   - owned: its straight-line depreciation per day, until fully depreciated —
 *     after that it costs nothing here (fuel and upkeep are expenses);
 *   - leasing, long-term rental: the monthly payment spread over the year's
 *     days, for the length of the contract;
 *   - short-term rental: the daily rate, for the length of the hire.
 *
 * Nothing before it arrived, and nothing after it was disposed of.
 */
export function equipmentDailyCost(equipment: EquipmentCostInput, day: string): number {
  if (toUtc(day) < toUtc(equipment.acquisitionDate)) {
    return 0;
  }
  if (equipment.disposalDate && toUtc(day) > toUtc(equipment.disposalDate)) {
    return 0;
  }

  switch (equipment.acquisitionMethod) {
    case AcquisitionMethod.CASH_PURCHASE:
    case AcquisitionMethod.CREDIT_PURCHASE: {
      const end = depreciationEndDate(equipment);
      return end !== null && toUtc(day) <= toUtc(end) ? depreciationPerDay(equipment) : 0;
    }
    case AcquisitionMethod.LEASING:
    case AcquisitionMethod.LONG_TERM_RENTAL:
      return withinContract(equipment, day) ? ((equipment.monthlyPayment ?? 0) * 12) / 365 : 0;
    case AcquisitionMethod.SHORT_TERM_RENTAL:
      return withinContract(equipment, day) ? (equipment.dailyRate ?? 0) : 0;
  }
}

function withinContract(equipment: EquipmentCostInput, day: string): boolean {
  return !equipment.contractEndDate || toUtc(day) <= toUtc(equipment.contractEndDate);
}

/** Rounded to the millime — the smallest unit of the dinar. */
function round(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

/**
 * The cost of the machine from `from` to `to`, both included — what an
 * assignment to a worksite adds to that worksite's cost. Summed day by day,
 * so a period that straddles the end of depreciation or of a contract counts
 * only the days that still cost something.
 */
export function equipmentCostOverPeriod(
  equipment: EquipmentCostInput,
  from: string,
  to: string,
): number {
  let total = 0;
  for (let day = from; toUtc(day) <= toUtc(to); day = nextDay(day)) {
    total += equipmentDailyCost(equipment, day);
  }
  return round(total);
}

/**
 * What an owned machine is still worth on its books on `day` (valeur nette
 * comptable): price minus the depreciation of every day up to and including
 * it, never below the residual value. `null` for what is not owned.
 */
export function netBookValue(equipment: EquipmentCostInput, day: string): number | null {
  if (!isOwned(equipment.acquisitionMethod) || equipment.purchasePrice == null) {
    return null;
  }
  const end = depreciationEndDate(equipment);
  if (end === null || toUtc(day) < toUtc(equipment.acquisitionDate)) {
    return equipment.purchasePrice;
  }
  const last = toUtc(day) < toUtc(end) ? day : end;
  const elapsed = daysBetweenInclusive(equipment.acquisitionDate, last);
  const value = equipment.purchasePrice - depreciationPerDay(equipment) * elapsed;
  return round(Math.max(equipment.residualValue ?? 0, value));
}
