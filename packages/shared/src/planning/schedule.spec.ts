import { describe, expect, it } from 'vitest';
import {
  planDays,
  proposeSchedule,
  rollUpSchedule,
  scheduleWindow,
  ScheduledNode,
} from './schedule';

const leaf = (
  plannedStart: string | null = null,
  plannedEnd: string | null = null,
): ScheduledNode => ({
  plannedStart,
  plannedEnd,
  children: [],
});
const parent = (...children: ScheduledNode[]): ScheduledNode => ({
  plannedStart: null,
  plannedEnd: null,
  children,
});

describe('planDays', () => {
  it('counts both ends, across a change of month', () => {
    expect(planDays('2026-01-30', '2026-02-02')).toBe(4);
    expect(planDays('2026-03-05', '2026-03-05')).toBe(1);
  });
});

describe('proposeSchedule', () => {
  it('runs the lowest lines one after the other over the period', () => {
    const [a, b] = [leaf(), leaf()];
    const dated = proposeSchedule([parent(a!, b!)], '2026-01-01', '2026-01-10');

    expect(dated.get(a!)).toEqual({ plannedStart: '2026-01-01', plannedEnd: '2026-01-05' });
    expect(dated.get(b!)).toEqual({ plannedStart: '2026-01-06', plannedEnd: '2026-01-10' });
  });

  it('dates only the lowest lines', () => {
    const child = leaf();
    const top = parent(child);

    const dated = proposeSchedule([top], '2026-01-01', '2026-01-02');

    expect(dated.has(top)).toBe(false);
    expect(dated.has(child)).toBe(true);
  });

  it('stays inside the period when there are more lines than days', () => {
    const leaves = Array.from({ length: 7 }, () => leaf());

    const dated = proposeSchedule(leaves, '2026-01-01', '2026-01-03');

    for (const { plannedStart, plannedEnd } of dated.values()) {
      expect(plannedStart >= '2026-01-01').toBe(true);
      expect(plannedEnd <= '2026-01-03').toBe(true);
      expect(plannedStart <= plannedEnd).toBe(true);
    }
    expect(dated.get(leaves[6]!)?.plannedEnd).toBe('2026-01-03');
  });

  it('copes with an end before the start', () => {
    const only = leaf();
    expect(proposeSchedule([only], '2026-01-05', '2026-01-01').get(only)).toEqual({
      plannedStart: '2026-01-05',
      plannedEnd: '2026-01-05',
    });
  });
});

describe('proposeSchedule, with percentages', () => {
  const line = (
    startPercent: number | null,
    durationPercent: number | null,
    children: Line[] = [],
  ): Line => ({ startPercent, durationPercent, children });
  interface Line {
    startPercent: number | null;
    durationPercent: number | null;
    children: Line[];
  }

  it('follows them, and lets lines overlap', () => {
    const [a, b] = [line(0, 60), line(50, 50)];

    const dated = proposeSchedule([a!, b!], '2026-01-01', '2026-01-10');

    expect(dated.get(a!)).toEqual({ plannedStart: '2026-01-01', plannedEnd: '2026-01-06' });
    expect(dated.get(b!)).toEqual({ plannedStart: '2026-01-06', plannedEnd: '2026-01-10' });
  });

  it('counts each level in percent of its parent', () => {
    const task = line(50, 50);
    const phase = line(50, 50, [task]);

    const dated = proposeSchedule([phase], '2026-01-01', '2026-01-20');

    expect(dated.get(task)).toEqual({ plannedStart: '2026-01-16', plannedEnd: '2026-01-20' });
  });

  it('shares a line evenly among children without percentages', () => {
    const [x, y] = [line(null, null), line(null, null)];
    const phase = line(0, 100, [x!, y!]);

    const dated = proposeSchedule([phase], '2026-01-01', '2026-01-10');

    expect(dated.get(y!)).toEqual({ plannedStart: '2026-01-06', plannedEnd: '2026-01-10' });
  });

  it('falls back to following one another when one sibling has none', () => {
    const [a, b] = [line(50, 50), line(null, null)];

    const dated = proposeSchedule([a!, b!], '2026-01-01', '2026-01-10');

    expect(dated.get(a!)?.plannedStart).toBe('2026-01-01');
  });

  it('never leaves the period, nor gives less than a day', () => {
    const [a, b] = [line(99, 40), line(100, 0)];

    const dated = proposeSchedule([a!, b!], '2026-01-01', '2026-01-04');

    for (const { plannedStart, plannedEnd } of dated.values()) {
      expect(plannedStart <= plannedEnd).toBe(true);
      expect(plannedEnd <= '2026-01-04').toBe(true);
    }
  });
});

describe('rollUpSchedule', () => {
  it('gives a parent the span of its children, at every level', () => {
    const [top] = rollUpSchedule([
      parent(parent(leaf('2026-02-01', '2026-02-05')), leaf('2026-01-20', '2026-01-25')),
    ]);

    expect(top?.plannedStart).toBe('2026-01-20');
    expect(top?.plannedEnd).toBe('2026-02-05');
    expect(top?.children[0]?.plannedStart).toBe('2026-02-01');
  });

  it('leaves a parent undated when no child is', () => {
    expect(rollUpSchedule([parent(leaf())])[0]?.plannedStart).toBeNull();
  });
});

describe('scheduleWindow', () => {
  it('spans the planning', () => {
    expect(
      scheduleWindow([leaf('2026-03-01', '2026-03-02'), leaf('2026-01-01', '2026-01-09')]),
    ).toEqual({ start: '2026-01-01', end: '2026-03-02' });
  });

  it('is null when nothing is dated', () => {
    expect(scheduleWindow([leaf()])).toBeNull();
  });
});
