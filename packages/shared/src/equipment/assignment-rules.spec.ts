import { describe, expect, it } from 'vitest';
import {
  assignmentPhase,
  earliestEndDate,
  frozenFieldTouched,
  mayCancelAssignment,
} from './assignment-rules';

const TODAY = '2026-09-27';
const upcoming = { worksiteId: 'ws-1', startDate: '2026-09-27', endDate: '2026-10-10' };
const inProgress = { worksiteId: 'ws-1', startDate: '2026-09-20', endDate: '2026-10-10' };
const past = { worksiteId: 'ws-1', startDate: '2026-09-01', endDate: '2026-09-10' };

describe('assignment phases', () => {
  it('counts today as not yet happened', () => {
    expect(assignmentPhase(upcoming, TODAY)).toBe('upcoming');
    expect(assignmentPhase(inProgress, TODAY)).toBe('in_progress');
    expect(assignmentPhase({ ...inProgress, endDate: TODAY }, TODAY)).toBe('in_progress');
    expect(assignmentPhase(past, TODAY)).toBe('past');
  });

  it('lets only an upcoming assignment be cancelled', () => {
    expect(mayCancelAssignment(upcoming, TODAY)).toBe(true);
    expect(mayCancelAssignment(inProgress, TODAY)).toBe(false);
    expect(mayCancelAssignment(past, TODAY)).toBe(false);
  });
});

describe('frozen days', () => {
  it('leave an upcoming assignment free', () => {
    expect(earliestEndDate(upcoming, TODAY)).toBeNull();
    expect(
      frozenFieldTouched(upcoming, { worksiteId: 'ws-2', startDate: '2026-11-01' }, TODAY),
    ).toBeNull();
  });

  it('keep an assignment in progress on its worksite and its start, ending no earlier than yesterday', () => {
    expect(earliestEndDate(inProgress, TODAY)).toBe('2026-09-26');
    expect(frozenFieldTouched(inProgress, { endDate: TODAY }, TODAY)).toBeNull();
    expect(frozenFieldTouched(inProgress, { endDate: '2026-09-26' }, TODAY)).toBeNull();
    expect(frozenFieldTouched(inProgress, { endDate: '2026-09-25' }, TODAY)).toBe('endDate');
    expect(frozenFieldTouched(inProgress, { worksiteId: 'ws-2' }, TODAY)).toBe('worksiteId');
    expect(frozenFieldTouched(inProgress, { startDate: '2026-09-21' }, TODAY)).toBe('startDate');
  });

  it('let a past assignment change nothing that happened — only be extended', () => {
    expect(earliestEndDate(past, TODAY)).toBe('2026-09-10');
    expect(frozenFieldTouched(past, { endDate: '2026-09-09' }, TODAY)).toBe('endDate');
    expect(frozenFieldTouched(past, { endDate: '2026-09-30' }, TODAY)).toBeNull();
    // The same values sent back, as a form does, change nothing.
    expect(frozenFieldTouched(past, { ...past }, TODAY)).toBeNull();
  });

  it('cross months and years', () => {
    expect(earliestEndDate({ startDate: '2025-12-01', endDate: '2026-03-01' }, '2026-01-01')).toBe(
      '2025-12-31',
    );
  });
});
