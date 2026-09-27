/**
 * What may still change on an assignment — the rule that keeps a worksite's
 * past cost from moving after the fact.
 *
 * **The days before today are frozen.** They happened: the machine was on
 * that worksite, and its cost is in that worksite's figures. Deleting the
 * assignment, moving it elsewhere, or trimming those days would rewrite a cost
 * that may already have been reported — silently, with nothing to explain it.
 *
 *   - upcoming (starts today or later): anything goes — nothing happened yet;
 *   - in progress (started before today): the worksite and the start stay; the
 *     end may move, but not before yesterday — "ending it today" is fine;
 *   - past (ended before today): only the notes; the end may still move later,
 *     which adds days without touching the ones that happened.
 *
 * Correcting a real mistake in the past is the `equipment:correct-history`
 * permission's — an admin's — and bypasses all of this.
 *
 * Shared so the API enforces exactly what the screen offers.
 */

export type AssignmentPhase = 'upcoming' | 'in_progress' | 'past';

interface Period {
  startDate: string;
  endDate: string;
}

function dayBefore(day: string): string {
  const [year = NaN, month = NaN, date = NaN] = day.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date - 1)).toISOString().slice(0, 10);
}

export function assignmentPhase(period: Period, today: string): AssignmentPhase {
  if (period.startDate >= today) {
    return 'upcoming';
  }
  return period.endDate < today ? 'past' : 'in_progress';
}

/** Whether the assignment can be deleted without rewriting any day that happened. */
export function mayCancelAssignment(period: Period, today: string): boolean {
  return assignmentPhase(period, today) === 'upcoming';
}

/**
 * The earliest end an assignment that already started may be given: its
 * frozen days are kept whole. `null` for an upcoming one, which is free.
 */
export function earliestEndDate(period: Period, today: string): string | null {
  if (assignmentPhase(period, today) === 'upcoming') {
    return null;
  }
  const yesterday = dayBefore(today);
  return period.endDate < yesterday ? period.endDate : yesterday;
}

/**
 * Why a change would rewrite a day that happened — the field it touches — or
 * `null` when it does not. `changes` holds only the fields being changed.
 */
export function frozenFieldTouched(
  current: Period & { worksiteId: string },
  changes: { worksiteId?: string; startDate?: string; endDate?: string },
  today: string,
): 'worksiteId' | 'startDate' | 'endDate' | null {
  const floor = earliestEndDate(current, today);
  if (floor === null) {
    return null;
  }
  if (changes.worksiteId !== undefined && changes.worksiteId !== current.worksiteId) {
    return 'worksiteId';
  }
  if (changes.startDate !== undefined && changes.startDate !== current.startDate) {
    return 'startDate';
  }
  if (changes.endDate !== undefined && changes.endDate < floor) {
    return 'endDate';
  }
  return null;
}
