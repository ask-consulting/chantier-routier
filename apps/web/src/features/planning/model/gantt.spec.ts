import { describe, expect, it } from 'vitest';
import { PlanNodeLevel, type IWorksiteTask } from '@chantia/shared';
import { barPosition, initiallyCollapsed, monthTicks, todayPosition, visibleRows } from './gantt';

const line = (id: string, level: PlanNodeLevel, children: IWorksiteTask[] = []): IWorksiteTask => ({
  id,
  level,
  label: id,
  isControl: false,
  plannedStart: '2026-01-01',
  plannedEnd: '2026-01-02',
  children,
});
const WINDOW = { start: '2026-01-01', end: '2026-01-10' };
const tree = [
  line('phase', PlanNodeLevel.PHASE, [
    line('task', PlanNodeLevel.TASK, [line('sub', PlanNodeLevel.SUBTASK)]),
    line('alone', PlanNodeLevel.TASK),
  ]),
];

describe('the Gantt chart', () => {
  it('opens on phases and tasks, with subtasks folded', () => {
    expect([...initiallyCollapsed(tree)]).toEqual(['task']);
  });

  it('draws what is not under a folded line, with its depth', () => {
    expect(visibleRows(tree, new Set(['task'])).map((row) => [row.task.id, row.depth])).toEqual([
      ['phase', 0],
      ['task', 1],
      ['alone', 1],
    ]);
    expect(visibleRows(tree, new Set())).toHaveLength(4);
    expect(visibleRows(tree, new Set(['phase']))).toHaveLength(1);
  });

  it('places a period in percent of the chart, both ends counted', () => {
    expect(barPosition('2026-01-01', '2026-01-10', WINDOW)).toEqual({ left: 0, width: 100 });
    expect(barPosition('2026-01-06', '2026-01-07', WINDOW)).toEqual({ left: 50, width: 20 });
  });

  it('shows today only inside the chart', () => {
    expect(todayPosition('2026-01-06', WINDOW)).toBeCloseTo(55);
    expect(todayPosition('2025-12-31', WINDOW)).toBeNull();
    expect(todayPosition('2026-01-11', WINDOW)).toBeNull();
  });

  it('marks each month, the first one at the edge', () => {
    expect(monthTicks({ start: '2026-01-16', end: '2026-03-02' }).map((tick) => tick.day)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
    ]);
    expect(monthTicks({ start: '2026-01-16', end: '2026-03-02' })[0]?.left).toBe(0);
  });
});
