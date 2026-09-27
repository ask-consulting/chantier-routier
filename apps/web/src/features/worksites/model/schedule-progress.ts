/**
 * Where a worksite stands in its planned schedule — time elapsed, not work
 * done: nothing in the data measures work done yet, and a progress bar that
 * pretended to would be a guess dressed as a figure.
 *
 * Pure, and in `model/`, so the cards and the worksite page read the same
 * numbers, and a test can pin them without a clock.
 */

export type ScheduleProgress =
  /** No planned start or end: nothing to measure against. */
  | { kind: 'unplanned' }
  /** Planned to start later. */
  | { kind: 'upcoming'; daysToStart: number }
  /** Within its planned period — `percent` of it elapsed. */
  | { kind: 'on_schedule'; percent: number; daysLeft: number }
  /** Past its planned end and still in progress. */
  | { kind: 'overdue'; daysLate: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(value: string): number {
  const [year = NaN, month = NaN, date = NaN] = value.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, date);
}

/** `today` as `YYYY-MM-DD`; the planned dates as the API sends them (a day, or midnight UTC). */
export function scheduleProgress(
  plannedStartDate: string | null,
  plannedEndDate: string | null,
  today: string,
): ScheduleProgress {
  if (!plannedStartDate || !plannedEndDate) {
    return { kind: 'unplanned' };
  }
  const start = utcDay(plannedStartDate);
  const end = utcDay(plannedEndDate);
  const now = utcDay(today);

  if (now < start) {
    return { kind: 'upcoming', daysToStart: Math.round((start - now) / DAY_MS) };
  }
  if (now > end) {
    return { kind: 'overdue', daysLate: Math.round((now - end) / DAY_MS) };
  }
  // Both ends included: a one-day worksite is 100 % on its day.
  const total = (end - start) / DAY_MS + 1;
  const elapsed = (now - start) / DAY_MS + 1;
  return {
    kind: 'on_schedule',
    percent: Math.round((elapsed / total) * 100),
    daysLeft: Math.round((end - now) / DAY_MS),
  };
}
