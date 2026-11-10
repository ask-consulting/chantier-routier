import { PlanNodeLevel } from '../enums/plan.enums';
import type {
  IMyWorksitePhase,
  IMyWorksiteStep,
  WorksiteHealth,
} from '../interfaces/worksite-plan.interface';
import { computeProgress, type ProgressNode } from './progress';
import { planDays, rollUpSchedule } from './schedule';

/**
 * Where a worksite stands, from its planning alone — pure, so the API and the
 * screens tell the same story.
 *
 * Weights follow the progress rule: subtasks share their task evenly, tasks
 * and phases weigh what their planned days weigh.
 */
export interface SummaryLine {
  level: PlanNodeLevel;
  label: string;
  isControl: boolean;
  plannedStart: string | null;
  plannedEnd: string | null;
  progress: number;
  children: SummaryLine[];
}

interface Weighted extends ProgressNode<Weighted> {
  children: Weighted[];
}

/** How many days before a control it starts to ask for attention. */
const CONTROL_NOTICE_DAYS = 2;

const weightOf = (line: SummaryLine): number | null =>
  line.level === PlanNodeLevel.SUBTASK || !line.plannedStart || !line.plannedEnd
    ? null
    : planDays(line.plannedStart, line.plannedEnd);

function toWeighted(line: SummaryLine, leafValue: (leaf: SummaryLine) => number): Weighted {
  return {
    durationPercent: weightOf(line),
    progress: line.children.length === 0 ? leafValue(line) : null,
    children: line.children.map((child) => toWeighted(child, leafValue)),
  };
}

const average = (lines: readonly SummaryLine[], leafValue: (leaf: SummaryLine) => number) =>
  lines.length === 0
    ? 0
    : computeProgress<Weighted>({
        children: lines.map((line) => toWeighted(line, leafValue)),
      });

/** Every line with its progress: entered on the lowest ones, calculated above. */
export function rollUpProgress<T extends SummaryLine>(lines: readonly T[]): T[] {
  return lines.map((line) =>
    line.children.length === 0
      ? line
      : {
          ...line,
          children: rollUpProgress(line.children),
          progress: Math.round(average(line.children, (leaf) => leaf.progress)),
        },
  );
}

/** Where a lowest line should be on `today`, from its planned dates. */
function plannedOf(leaf: SummaryLine, today: string): number {
  if (!leaf.plannedStart || !leaf.plannedEnd || today < leaf.plannedStart) {
    return 0;
  }
  if (today >= leaf.plannedEnd) {
    return 100;
  }
  return (
    ((planDays(leaf.plannedStart, today) - 1) / planDays(leaf.plannedStart, leaf.plannedEnd)) * 100
  );
}

function leavesOf(lines: readonly SummaryLine[]): SummaryLine[] {
  return lines.flatMap((line) => (line.children.length === 0 ? [line] : leavesOf(line.children)));
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface PlanSummary {
  progress: number;
  plannedProgress: number;
  delayDays: number;
  health: WorksiteHealth;
  phases: IMyWorksitePhase[];
  nextSteps: IMyWorksiteStep[];
}

/**
 * The figures of a worksite on `today`. Late when a line should already have
 * ended and has not; to control when an unfinished check is due within two
 * days; on time otherwise.
 */
export function summarizePlan(
  lines: readonly SummaryLine[],
  today: string,
  steps = 3,
): PlanSummary {
  const dated = rollUpProgress(rollUpSchedule(lines));
  const leaves = leavesOf(dated);
  const open = leaves.filter((leaf) => leaf.progress < 100);
  const delayDays = open.reduce(
    (worst, leaf) =>
      leaf.plannedEnd && leaf.plannedEnd < today
        ? Math.max(worst, planDays(leaf.plannedEnd, today) - 1)
        : worst,
    0,
  );
  const controlDue = open.some(
    (leaf) =>
      leaf.isControl &&
      leaf.plannedStart &&
      leaf.plannedStart <= addDays(today, CONTROL_NOTICE_DAYS),
  );
  return {
    progress: Math.round(average(dated, (leaf) => leaf.progress)),
    plannedProgress: Math.round(average(dated, (leaf) => plannedOf(leaf, today))),
    delayDays,
    health: delayDays > 0 ? 'late' : controlDue ? 'control' : 'ok',
    phases: dated.map((phase) => ({
      label: phase.label,
      plannedStart: phase.plannedStart,
      plannedEnd: phase.plannedEnd,
      progress: phase.progress,
    })),
    nextSteps: [...open]
      .sort((a, b) => (a.plannedStart ?? '9999').localeCompare(b.plannedStart ?? '9999'))
      .slice(0, steps)
      .map((leaf) => ({
        label: leaf.label,
        plannedStart: leaf.plannedStart,
        isControl: leaf.isControl,
      })),
  };
}
