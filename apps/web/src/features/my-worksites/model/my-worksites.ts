import type { IMyWorksite, IWorksiteTask, WorksiteHealth } from '@chantia/shared';
import type { Tone } from '@/shared/ui';

/** « Dans les temps » is the normal state: green stays for what is finished. */
export const HEALTH_TONE: Record<WorksiteHealth, Tone> = {
  late: 'danger',
  control: 'signal',
  ok: 'info',
};

/** The phase under way: the first not finished, or the last when all are. */
export function currentPhaseIndex(worksite: Pick<IMyWorksite, 'phases'>): number {
  const index = worksite.phases.findIndex((phase) => phase.progress < 100);
  return index === -1 ? Math.max(0, worksite.phases.length - 1) : index;
}

/** Where a period sits between two days, in percent: for the phase bars. */
export function span(
  from: string | null,
  to: string | null,
  window: { start: string | null; end: string | null },
): { left: number; width: number } | null {
  if (!from || !to || !window.start || !window.end) {
    return null;
  }
  const day = (value: string) => Date.parse(`${value}T00:00:00.000Z`) / 86_400_000;
  const total = day(window.end) - day(window.start) + 1;
  if (total <= 0) {
    return null;
  }
  const left = Math.max(0, ((day(from) - day(window.start)) / total) * 100);
  return { left, width: Math.min(100 - left, ((day(to) - day(from) + 1) / total) * 100) };
}

/** The lines progress is entered on, under one phase. */
export function entryLines(
  phase: IWorksiteTask,
): { task: IWorksiteTask; lines: IWorksiteTask[] }[] {
  return phase.children.map((task) => ({
    task,
    lines: task.children.length === 0 ? [task] : task.children,
  }));
}
