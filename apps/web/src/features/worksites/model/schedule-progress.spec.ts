import { describe, expect, it } from 'vitest';
import { scheduleProgress } from './schedule-progress';

describe('scheduleProgress', () => {
  it('measures nothing without both planned dates', () => {
    expect(scheduleProgress(null, '2026-12-31', '2026-09-27')).toEqual({ kind: 'unplanned' });
    expect(scheduleProgress('2026-01-01', null, '2026-09-27')).toEqual({ kind: 'unplanned' });
  });

  it('counts the days to a planned start', () => {
    expect(scheduleProgress('2026-10-01', '2026-12-31', '2026-09-27')).toEqual({
      kind: 'upcoming',
      daysToStart: 4,
    });
  });

  it('gives the share of the planned period elapsed, both ends included', () => {
    expect(scheduleProgress('2026-09-01', '2026-09-10', '2026-09-05')).toEqual({
      kind: 'on_schedule',
      percent: 50,
      daysLeft: 5,
    });
    expect(scheduleProgress('2026-09-27', '2026-09-27', '2026-09-27')).toEqual({
      kind: 'on_schedule',
      percent: 100,
      daysLeft: 0,
    });
  });

  it('reads the API’s midnight-UTC timestamps as the days they are', () => {
    expect(
      scheduleProgress('2026-09-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z', '2026-09-10'),
    ).toMatchObject({ kind: 'on_schedule', percent: 100 });
  });

  it('says how late a worksite past its planned end is', () => {
    expect(scheduleProgress('2026-06-01', '2026-09-20', '2026-09-27')).toEqual({
      kind: 'overdue',
      daysLate: 7,
    });
  });
});
