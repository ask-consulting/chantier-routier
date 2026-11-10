import { describe, expect, it } from 'vitest';
import { PlanNodeLevel, type IWorksiteTask } from '@chantia/shared';
import { currentPhaseIndex, entryLines, span } from './my-worksites';

const phase = (progress: number) => ({
  label: 'x',
  plannedStart: null,
  plannedEnd: null,
  progress,
});

describe('my worksites', () => {
  it('finds the phase under way, the last when all are done, the first when none', () => {
    expect(currentPhaseIndex({ phases: [phase(100), phase(30), phase(0)] })).toBe(1);
    expect(currentPhaseIndex({ phases: [phase(100), phase(100)] })).toBe(1);
    expect(currentPhaseIndex({ phases: [] })).toBe(0);
  });

  it('places a period inside its window, and nowhere without dates', () => {
    expect(span('2026-01-06', '2026-01-10', { start: '2026-01-01', end: '2026-01-10' })).toEqual({
      left: 50,
      width: 50,
    });
    expect(span(null, '2026-01-10', { start: '2026-01-01', end: '2026-01-10' })).toBeNull();
    expect(span('2026-01-01', '2026-01-02', { start: '2026-01-05', end: '2026-01-01' })).toBeNull();
  });

  it('enters progress on subtasks, or on a task that has none', () => {
    const leaf = (id: string): IWorksiteTask => ({
      id,
      level: PlanNodeLevel.SUBTASK,
      label: id,
      isControl: false,
      plannedStart: null,
      plannedEnd: null,
      progress: 0,
      children: [],
    });
    const lines = entryLines({
      ...leaf('p'),
      children: [{ ...leaf('t'), children: [leaf('s')] }, leaf('alone')],
    });

    expect(lines.map((group) => group.lines.map((l) => l.id))).toEqual([['s'], ['alone']]);
  });
});
