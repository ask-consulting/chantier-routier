import { averageProgress, computeProgress, UserRole, type ProgressNode } from '@chantia/shared';
import type { Tone } from '@/shared/ui';
import data from '../data/my-worksites.json';

/**
 * The shape of `data/my-worksites.json`, which stands in for the API for now:
 * replacing it means replacing `loadMyWorksites`, and nothing on the screens.
 */
export type WorksiteHealth = 'late' | 'control' | 'ok';

export interface Subtask {
  id: string;
  label: string;
  progress: number;
}
export interface Task {
  label: string;
  durationPercent: number;
  subtasks: Subtask[];
}
export interface Phase {
  label: string;
  startPercent: number;
  durationPercent: number;
  tasks: Task[];
}
export interface ListLine {
  title: string;
  detail: string;
  meta: string;
}
export interface TodoLine {
  label: string;
  detail: string;
  kind: 'control' | 'purchase' | 'team';
}
export interface MyWorksite {
  id: string;
  code: string;
  name: string;
  client: string;
  status: WorksiteHealth;
  delayDays: number | null;
  plannedProgress: number;
  spendPercent: number;
  teamCount: number;
  gearCount: number;
  next: { when: string; label: string };
  /** Who it is assigned to: everything else about visibility follows from this. */
  assignedEmails: string[];
  phases: Phase[];
  todo: TodoLine[];
  team: ListLine[];
  equipment: ListLine[];
  purchases: ListLine[];
  notes: ListLine[];
}

export type Viewer = { role: UserRole; email: string };

export function loadMyWorksites(): MyWorksite[] {
  return data.worksites as MyWorksite[];
}

/** An admin sees every worksite; everybody else, those they are assigned to. */
export function isVisibleTo(worksite: MyWorksite, viewer: Viewer): boolean {
  return viewer.role === UserRole.ADMIN || worksite.assignedEmails.includes(viewer.email);
}

interface Line extends ProgressNode<Line> {
  children: Line[];
}

const taskLine = (task: Task): Line => ({
  durationPercent: task.durationPercent,
  children: task.subtasks.map((subtask) => ({ progress: subtask.progress, children: [] })),
});
const phaseLine = (phase: Phase): Line => ({
  durationPercent: phase.durationPercent,
  children: phase.tasks.map(taskLine),
});

export const taskProgress = (task: Task): number => computeProgress(taskLine(task));
export const phaseProgress = (phase: Phase): number => computeProgress(phaseLine(phase));
export const worksiteProgress = (worksite: MyWorksite): number =>
  averageProgress(worksite.phases.map(phaseLine));

/** The phase under way: the first not finished, or the last when all are. */
export function currentPhaseIndex(worksite: MyWorksite): number {
  const index = worksite.phases.findIndex((phase) => phaseProgress(phase) < 100);
  return index === -1 ? worksite.phases.length - 1 : index;
}

/** The worksite with one subtask moved. The others are left untouched. */
export function withSubtaskProgress(
  worksite: MyWorksite,
  subtaskId: string,
  progress: number,
): MyWorksite {
  return {
    ...worksite,
    phases: worksite.phases.map((phase) => ({
      ...phase,
      tasks: phase.tasks.map((task) => ({
        ...task,
        subtasks: task.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, progress } : subtask,
        ),
      })),
    })),
  };
}

/** « En cours » est l'état normal : le vert reste réservé à ce qui est terminé. */
export const HEALTH_TONE: Record<WorksiteHealth, Tone> = {
  late: 'danger',
  control: 'signal',
  ok: 'info',
};

export const TODO_TONE: Record<TodoLine['kind'], Tone> = {
  control: 'signal',
  purchase: 'neutral',
  team: 'neutral',
};
