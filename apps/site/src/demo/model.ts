import type { Copy } from '@/content/copy';

/**
 * The example worksite behind the page's demo, and the arithmetic over it.
 *
 * Pure on purpose: the numbers a visitor reads are the one part of a showcase
 * that can be plainly wrong, so they are the part with tests.
 */

export type PayMode = 0 | 1 | 2; // by task, by day, by hour
export const HOURS_PER_DAY = 8;
export const LAST_DAY = 24;
export const PLANNED_END = 20;

export type MaterialKey = keyof Copy['m'];
export type TaskId = keyof Copy['tasks'];

export interface CrewMember {
  id: string;
  name: string;
  byTask: number;
  byDay: number;
  byHour: number;
  defaultMode: PayMode;
}

export interface Material {
  key: MaterialKey;
  unit: string;
  planned: number;
  price: number;
  /** Actual consumption over planned: 1.18 means 18 % more than planned. */
  overrun: number;
}

export interface Task {
  id: TaskId;
  plan: [number, number];
  real: [number, number];
  crew: CrewMember[];
  gear: { name: string; rate: number }[];
  materials: Material[];
}

const person = (
  id: string,
  name: string,
  byTask: number,
  byDay: number,
  byHour: number,
  defaultMode: PayMode,
): CrewMember => ({ id, name, byTask, byDay, byHour, defaultMode });

const material = (
  key: MaterialKey,
  unit: string,
  planned: number,
  price: number,
  overrun = 1,
): Material => ({ key, unit, planned, price, overrun });

export const TASKS: Task[] = [
  {
    id: 't1',
    plan: [1, 4],
    real: [1, 5],
    crew: [person('amine', 'Amine B.', 300, 60, 8, 1), person('sami', 'Sami K.', 250, 50, 7, 2)],
    gear: [
      { name: 'Pelle P-04', rate: 710 },
      { name: 'Camion T-07', rate: 290 },
    ],
    materials: [material('trab', 'm³', 400, 12), material('hjar', 'm³', 60, 45, 1.05)],
  },
  {
    id: 't2',
    plan: [5, 9],
    real: [6, 11],
    crew: [person('sami', 'Sami K.', 600, 55, 7.5, 0), person('walid', 'Walid M.', 650, 70, 9, 1)],
    gear: [
      { name: 'Bétonnière B-02', rate: 120 },
      { name: 'Vibreur V-01', rate: 40 },
    ],
    materials: [
      material('sment', 't', 30, 230, 1.18),
      material('hdid', 't', 6, 2900),
      material('rmel', 'm³', 80, 35),
    ],
  },
  {
    id: 't3',
    plan: [10, 16],
    real: [12, 19],
    crew: [person('hedi', 'Hedi T.', 900, 75, 10, 1), person('nizar', 'Nizar A.', 780, 65, 8.5, 0)],
    gear: [{ name: 'Grue G-02', rate: 950 }],
    materials: [
      material('ajour', 'p', 18000, 0.55, 1.03),
      material('sment', 't', 40, 230, 1.04),
      material('rmel', 'm³', 120, 35),
    ],
  },
  {
    id: 't4',
    plan: [14, 18],
    real: [16, 20],
    crew: [person('walid', 'Walid M.', 400, 70, 9, 0), person('amine', 'Amine B.', 340, 60, 8, 2)],
    gear: [{ name: 'Mini-pelle P-09', rate: 380 }],
    materials: [material('tiyo', 'm', 300, 28)],
  },
  {
    id: 't5',
    plan: [17, 20],
    real: [21, 24],
    crew: [person('hedi', 'Hedi T.', 420, 75, 10, 1), person('sami', 'Sami K.', 300, 55, 7.5, 1)],
    gear: [
      { name: 'Finisseur F-01', rate: 1000 },
      { name: 'Compacteur C-01', rate: 380 },
    ],
    materials: [material('zeft', 't', 90, 210, 1.1), material('hjar', 'm³', 140, 45)],
  },
];

export interface DemoState {
  day: number;
  /** Pay mode chosen by the visitor, keyed `task-worker`. */
  modes: Record<string, PayMode>;
  validated: Partial<Record<TaskId, boolean>>;
}

export const INITIAL_STATE: DemoState = { day: 11, modes: {}, validated: { t1: true } };

export const modeKey = (task: Task, worker: CrewMember): string => `${task.id}-${worker.id}`;

export const modeOf = (state: DemoState, task: Task, worker: CrewMember): PayMode =>
  state.modes[modeKey(task, worker)] ?? worker.defaultMode;

export function labourCost(
  worker: CrewMember,
  mode: PayMode,
  progress: number,
  days: number,
): number {
  if (mode === 0) return worker.byTask * progress;
  if (mode === 1) return worker.byDay * days;
  return worker.byHour * HOURS_PER_DAY * days;
}

const gearRate = (task: Task): number => task.gear.reduce((sum, g) => sum + g.rate, 0);

export interface Measure {
  duration: number;
  days: number;
  progress: number;
  labour: number;
  materials: number;
  equipment: number;
}

export function measure(task: Task, state: DemoState, at: number): Measure {
  const duration = task.real[1] - task.real[0] + 1;
  const days = Math.max(0, Math.min(duration, at - task.real[0] + 1));
  const progress = days / duration;
  return {
    duration,
    days,
    progress,
    labour: task.crew.reduce(
      (sum, w) => sum + labourCost(w, modeOf(state, task, w), progress, days),
      0,
    ),
    materials: task.materials.reduce(
      (sum, m) => sum + m.planned * m.price * m.overrun * progress,
      0,
    ),
    equipment: gearRate(task) * days,
  };
}

/** What the task should have cost: planned dates, planned quantities, agreed pay. */
export function plannedCost(task: Task): number {
  const duration = task.plan[1] - task.plan[0] + 1;
  return (
    task.crew.reduce((sum, w) => sum + labourCost(w, w.defaultMode, 1, duration), 0) +
    task.materials.reduce((sum, m) => sum + m.planned * m.price, 0) +
    gearRate(task) * duration
  );
}

const total = (m: Measure): number => m.labour + m.materials + m.equipment;

export interface Totals {
  labour: number;
  materials: number;
  equipment: number;
  spent: number;
  budget: number;
  forecast: number;
}

export function totals(state: DemoState): Totals {
  const now = TASKS.map((task) => measure(task, state, state.day));
  const sum = (pick: (m: Measure) => number) => now.reduce((acc, m) => acc + pick(m), 0);
  return {
    labour: sum((m) => m.labour),
    materials: sum((m) => m.materials),
    equipment: sum((m) => m.equipment),
    spent: sum(total),
    budget: TASKS.reduce((acc, task) => acc + plannedCost(task), 0),
    forecast: TASKS.reduce((acc, task) => acc + total(measure(task, state, LAST_DAY)), 0),
  };
}

export function isLate(task: Task, day: number): boolean {
  if (day > task.plan[1]) return task.real[1] > task.plan[1];
  return day >= task.real[0] && task.real[0] > task.plan[0];
}

export interface Alert {
  level: 1 | 2;
  text: string;
}

/** The alerts to show on `day`: failed controls first, at most four. */
export function alerts(state: DemoState, t: Copy): Alert[] {
  const found: Alert[] = [];
  for (const task of TASKS) {
    const name = t.tasks[task.id];
    const { day } = state;
    if (day > task.plan[0] && day < task.real[0]) {
      found.push({ level: 1, text: t.waiting(name) });
    } else if (day > task.plan[1] && day >= task.real[0] && task.real[1] > task.plan[1]) {
      found.push({ level: 1, text: t.late(name, Math.min(day, task.real[1]) - task.plan[1]) });
    }
    if (day >= task.real[1] && !state.validated[task.id]) {
      found.push({ level: 2, text: t.ctl(name) });
    }
    const { progress } = measure(task, state, day);
    for (const m of task.materials) {
      if (m.overrun >= 1.1 && progress >= 0.3) {
        found.push({ level: 1, text: t.cons(t.m[m.key], Math.round((m.overrun - 1) * 100)) });
      }
    }
  }
  return found.sort((a, b) => b.level - a.level).slice(0, 4);
}

export const money = (n: number): string =>
  `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} TND`;

export const quantity = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
