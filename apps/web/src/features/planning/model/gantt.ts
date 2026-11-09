import { planDays, PlanNodeLevel, type IWorksiteTask } from '@chantia/shared';

export interface GanttRow {
  task: IWorksiteTask;
  depth: number;
}

export interface GanttWindow {
  start: string;
  end: string;
}

/** A planning opens on its phases and tasks: the subtasks are one click away. */
export function initiallyCollapsed(tasks: readonly IWorksiteTask[]): Set<string> {
  const ids = new Set<string>();
  const visit = (nodes: readonly IWorksiteTask[]): void => {
    for (const node of nodes) {
      if (node.level === PlanNodeLevel.TASK && node.children.length > 0) {
        ids.add(node.id);
      }
      visit(node.children);
    }
  };
  visit(tasks);
  return ids;
}

/** The lines to draw, in order, leaving out what is under a collapsed one. */
export function visibleRows(
  tasks: readonly IWorksiteTask[],
  collapsed: ReadonlySet<string>,
  depth = 0,
): GanttRow[] {
  return tasks.flatMap((task) => [
    { task, depth },
    ...(collapsed.has(task.id) ? [] : visibleRows(task.children, collapsed, depth + 1)),
  ]);
}

/** Where a period sits on the chart, in percent of its width. */
export function barPosition(
  start: string,
  end: string,
  window: GanttWindow,
): { left: number; width: number } {
  const total = planDays(window.start, window.end);
  return {
    left: ((planDays(window.start, start) - 1) / total) * 100,
    width: (planDays(start, end) / total) * 100,
  };
}

/** The position of today, or `null` when the chart does not reach it. */
export function todayPosition(today: string, window: GanttWindow): number | null {
  if (today < window.start || today > window.end) {
    return null;
  }
  return ((planDays(window.start, today) - 0.5) / planDays(window.start, window.end)) * 100;
}

/** The first day of each month of the chart, and where it falls. */
export function monthTicks(window: GanttWindow): { day: string; left: number }[] {
  const ticks: { day: string; left: number }[] = [];
  const [year = 0, month = 1] = window.start.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, 1));
  while (cursor.toISOString().slice(0, 10) <= window.end) {
    const day = cursor.toISOString().slice(0, 10);
    ticks.push({ day, left: day < window.start ? 0 : barPosition(day, day, window).left });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}
