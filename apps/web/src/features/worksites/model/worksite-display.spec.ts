import { WorksiteStatus } from '@chantia/shared';
import { describe, expect, it } from 'vitest';
import { WORKSITE_STATUS, WORKSITE_STATUS_TONE, varianceTone } from './worksite-display';

/**
 * `model/` holds the decisions a screen makes before drawing anything, which is
 * exactly what survives a redesign. These pin the two that carry meaning rather
 * than taste — a tone that says "normal" versus "well done", and the sign of a
 * budget variance.
 */

describe('WORKSITE_STATUS_TONE', () => {
  it('gives every status a tone', () => {
    for (const status of Object.values(WorksiteStatus)) {
      expect(WORKSITE_STATUS_TONE[status]).toBeTruthy();
    }
  });

  /**
   * Green is reserved for "completed". A worksite in progress is the normal
   * state, not an achievement — and if the normal state is green, green stops
   * meaning anything.
   */
  it('keeps success for what is finished, not for what is merely running', () => {
    expect(WORKSITE_STATUS_TONE[WorksiteStatus.COMPLETED]).toBe('success');
    expect(WORKSITE_STATUS_TONE[WorksiteStatus.IN_PROGRESS]).toBe('info');
  });

  /** Danger stays for the irreversible. A suspended worksite resumes. */
  it('signals a suspended worksite without calling it a failure', () => {
    expect(WORKSITE_STATUS_TONE[WorksiteStatus.SUSPENDED]).toBe('signal');
  });
});

describe('WORKSITE_STATUS', () => {
  it('lists every status exactly once', () => {
    expect([...WORKSITE_STATUS].sort()).toEqual(Object.values(WorksiteStatus).sort());
  });

  /** Reading order, not enum order — a filter bar follows the site's life. */
  it('runs from upcoming to suspended', () => {
    expect(WORKSITE_STATUS).toEqual([
      WorksiteStatus.UPCOMING,
      WorksiteStatus.IN_PROGRESS,
      WorksiteStatus.COMPLETED,
      WorksiteStatus.SUSPENDED,
    ]);
  });
});

describe('varianceTone', () => {
  it('celebrates money left and flags money over', () => {
    expect(varianceTone(1200)).toBe('success');
    expect(varianceTone(-1200)).toBe('danger');
  });

  /**
   * Landing exactly on budget is a rounding coincidence, not a result. Green
   * here would congratulate an accident.
   */
  it('stays neutral on exactly zero', () => {
    expect(varianceTone(0)).toBe('neutral');
  });

  it('stays neutral when there is no budget to compare against', () => {
    expect(varianceTone(null)).toBe('neutral');
  });
});
