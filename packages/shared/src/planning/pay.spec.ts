import { describe, expect, it } from 'vitest';
import { PayMode } from '../enums/plan.enums';
import { defaultTaskRate, HOURS_PER_DAY } from './pay';

describe('defaultTaskRate', () => {
  it('proposes the worker’s rate by the hour, a working day of it by the day', () => {
    expect(defaultTaskRate(PayMode.HOUR, 6500)).toBe(6500);
    expect(defaultTaskRate(PayMode.DAY, 6500)).toBe(6500 * HOURS_PER_DAY);
  });

  it('proposes nothing for a lump sum: it is agreed per task', () => {
    expect(defaultTaskRate(PayMode.TASK, 6500)).toBeNull();
  });
});
