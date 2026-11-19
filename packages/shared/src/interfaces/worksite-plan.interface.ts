import { PayMode, PlanNodeLevel } from '../enums/plan.enums';

/** One line of a worksite's planning. A line with children takes their dates. */
export interface IWorksiteTask {
  id: string;
  level: PlanNodeLevel;
  label: string;
  isControl: boolean;
  plannedStart: string | null;
  plannedEnd: string | null;
  /** 0 to 100. Entered on the lowest lines, calculated on the others. */
  progress: number;
  children: IWorksiteTask[];
}

export interface IWorksitePlan {
  tasks: IWorksiteTask[];
}

/** Names exactly one source: a reference plan or one of the organization's. */
export interface IInitializeWorksitePlan {
  templateId?: string;
  organizationPlanId?: string;
  /** The language to copy reference labels in. French by default. */
  locale?: string;
}

export interface IUpdateWorksiteTask {
  plannedStart: string;
  plannedEnd: string;
}

export interface IUpdateTaskProgress {
  /** 0 to 100, on a lowest line. */
  progress: number;
}

/** How a worksite is doing, in one word: what the cards and the badges show. */
export type WorksiteHealth = 'late' | 'control' | 'ok';

export interface IMyWorksitePhase {
  label: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  progress: number;
}

export interface IMyWorksiteStep {
  label: string;
  plannedStart: string | null;
  isControl: boolean;
}

/** A worksite as « mes chantiers » shows it, its figures calculated from its planning. */
export interface IMyWorksite {
  id: string;
  code: string;
  name: string;
  client: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  health: WorksiteHealth;
  progress: number;
  /** Where the planning says it should be today. */
  plannedProgress: number;
  /** Days since the oldest unfinished line should have ended. `0` when none is overdue. */
  delayDays: number;
  phases: IMyWorksitePhase[];
  /** The next lines to do, the earliest first. */
  nextSteps: IMyWorksiteStep[];
  memberCount: number;
}

export interface IWorksiteMember {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface IUpdateWorksiteMembers {
  userIds: string[];
}

/** A worker on a task. `rate` is withheld from whoever cannot read budgets. */
export interface ITaskWorker {
  id: string;
  taskId: string;
  workerId: string;
  workerName: string;
  qualification: string | null;
  payMode: PayMode;
  /** In the currency's smallest unit: per hour, per day, or for the whole task. */
  rate?: number;
}

/** A machine booked on the worksite, put on one of its tasks. */
export interface ITaskEquipment {
  id: string;
  taskId: string;
  equipmentAssignmentId: string;
  designation: string;
  startDate: string;
  endDate: string;
}

/** Everybody and everything on the tasks of one worksite. */
export interface ITaskTeam {
  workers: ITaskWorker[];
  equipment: ITaskEquipment[];
}

export interface IAssignTaskWorker {
  workerId: string;
  payMode: PayMode;
  /** Required by the task; by the hour or the day, the worker's rate by default. */
  rate?: number;
}

export interface ILinkTaskEquipment {
  equipmentAssignmentId: string;
}
