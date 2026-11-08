import { describe, expect, it } from 'vitest';
import { copy } from '@/content/copy';
import {
  alerts,
  INITIAL_STATE,
  isLate,
  labourCost,
  LAST_DAY,
  measure,
  modeKey,
  modeOf,
  money,
  plannedCost,
  quantity,
  TASKS,
  totals,
} from './model';

const [t1, t2] = TASKS;
const fr = copy.fr;

describe('labourCost', () => {
  const worker = t2.crew[0];

  it('counts a task price in proportion to progress', () => {
    expect(labourCost(worker, 0, 0.5, 3)).toBe(300);
  });

  it('counts a daily rate by days worked', () => {
    expect(labourCost(worker, 1, 0.5, 3)).toBe(165);
  });

  it('counts an hourly rate over an eight-hour day', () => {
    expect(labourCost(worker, 2, 0.5, 3)).toBe(180);
  });
});

describe('measure', () => {
  it('is zero before the task starts', () => {
    const m = measure(t2, INITIAL_STATE, 5);
    expect(m.days).toBe(0);
    expect(m.progress).toBe(0);
    expect(m.labour + m.materials + m.equipment).toBe(0);
  });

  it('stops counting once the task is finished', () => {
    expect(measure(t1, INITIAL_STATE, LAST_DAY).days).toBe(5);
    expect(measure(t1, INITIAL_STATE, LAST_DAY).progress).toBe(1);
  });

  it('charges the overrun on materials', () => {
    const cement = t2.materials[0];
    const others = t2.materials.slice(1).reduce((s, m) => s + m.planned * m.price, 0);
    expect(measure(t2, INITIAL_STATE, LAST_DAY).materials).toBeCloseTo(
      cement.planned * cement.price * 1.18 + others,
    );
  });
});

describe('the pay mode belongs to the worker on a task', () => {
  it('lets the same worker be paid differently on two tasks', () => {
    const sami1 = t1.crew.find((w) => w.id === 'sami')!;
    const sami2 = t2.crew.find((w) => w.id === 'sami')!;
    expect(modeOf(INITIAL_STATE, t1, sami1)).toBe(2);
    expect(modeOf(INITIAL_STATE, t2, sami2)).toBe(0);
  });

  it('changes that task only', () => {
    const sami2 = t2.crew.find((w) => w.id === 'sami')!;
    const before = measure(t1, INITIAL_STATE, LAST_DAY).labour;
    const state = { ...INITIAL_STATE, modes: { [modeKey(t2, sami2)]: 1 as const } };
    expect(measure(t1, state, LAST_DAY).labour).toBe(before);
    expect(measure(t2, state, LAST_DAY).labour).not.toBe(
      measure(t2, INITIAL_STATE, LAST_DAY).labour,
    );
  });
});

describe('totals', () => {
  it('adds the three kinds of cost up to what was spent', () => {
    const x = totals(INITIAL_STATE);
    expect(x.spent).toBeCloseTo(x.labour + x.materials + x.equipment);
  });

  it('spends the whole forecast on the last day', () => {
    const x = totals({ ...INITIAL_STATE, day: LAST_DAY });
    expect(x.spent).toBeCloseTo(x.forecast);
  });

  it('forecasts more than the budget on this late, wasteful worksite', () => {
    const x = totals(INITIAL_STATE);
    expect(x.forecast).toBeGreaterThan(x.budget);
    expect(x.budget).toBe(TASKS.reduce((s, task) => s + plannedCost(task), 0));
  });

  it('forecasts the same whatever the day', () => {
    expect(totals({ ...INITIAL_STATE, day: 2 }).forecast).toBe(
      totals({ ...INITIAL_STATE, day: 20 }).forecast,
    );
  });
});

describe('isLate', () => {
  it('flags a task past its planned end that finishes later', () => {
    expect(isLate(t2, 10)).toBe(true);
  });

  it('flags a task that started after its planned start', () => {
    expect(isLate(t2, 6)).toBe(true);
  });

  it('does not flag a task before its real start', () => {
    expect(isLate(t2, 4)).toBe(false);
  });
});

describe('alerts', () => {
  const texts = (day: number, validated = INITIAL_STATE.validated) =>
    alerts({ ...INITIAL_STATE, day, validated }, fr).map((a) => a.text);

  it('has nothing to say on day one', () => {
    expect(texts(1)).toEqual([]);
  });

  it('says how late a task is', () => {
    expect(texts(11)).toContain('Fondations : 2 j de retard');
  });

  it('says when a task has not started on time', () => {
    expect(texts(5.5)).toContain('Fondations : toujours pas commencé');
  });

  it('puts an unvalidated control first', () => {
    expect(texts(11)[0]).toBe('Contrôle « Fondations » non validé');
  });

  it('drops the control alert once validated', () => {
    expect(texts(11, { t1: true, t2: true })).not.toContain('Contrôle « Fondations » non validé');
  });

  it('flags overconsumption once the task is under way', () => {
    expect(texts(8)).toContain('Ciment : +18 % par rapport au prévu');
  });

  it('shows at most four', () => {
    expect(texts(LAST_DAY, {}).length).toBeLessThanOrEqual(4);
  });
});

describe('formatting', () => {
  it('groups thousands', () => {
    expect(money(1234567.4)).toBe('1 234 567 TND');
    expect(quantity(18000)).toBe('18 000');
  });
});
