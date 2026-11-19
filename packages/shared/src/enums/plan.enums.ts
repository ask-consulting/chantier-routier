/** The families of worksites a plan can be written for. */
export enum WorksiteKind {
  BUILDING = 'building',
  ROADS = 'roads',
  NETWORKS = 'networks',
  EARTHWORKS = 'earthworks',
  OTHER = 'other',
}

/** The three levels of a project plan, from the widest to the finest. */
export enum PlanNodeLevel {
  PHASE = 'phase',
  TASK = 'task',
  SUBTASK = 'subtask',
}

/** French, Arabic, and Tunisian in Arabic (`aeb`) and in Latin letters. */
export const PLAN_LABEL_LOCALES = ['fr', 'ar', 'aeb', 'aeb-Latn'];

/** How a worker is paid on one task: for the whole task, by the day or by the hour. */
export enum PayMode {
  TASK = 'task',
  DAY = 'day',
  HOUR = 'hour',
}
