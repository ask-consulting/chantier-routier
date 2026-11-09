import { PlanNodeLevel } from '../enums/plan.enums';

/** One line of a worksite's planning. A line with children takes their dates. */
export interface IWorksiteTask {
  id: string;
  level: PlanNodeLevel;
  label: string;
  isControl: boolean;
  plannedStart: string | null;
  plannedEnd: string | null;
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
