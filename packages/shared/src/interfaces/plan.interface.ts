import { PlanNodeLevel, WorksiteKind } from '../enums/plan.enums';
import { Translations } from './equipment.interface';

/** A reference plan as listed: enough to choose one without loading its tree. */
export interface IPlanTemplateSummary {
  id: string;
  code: string;
  kind: WorksiteKind;
  labels: Translations;
  nodeCount: number;
}

export interface IPlanTemplateNode {
  id: string;
  code: string;
  level: PlanNodeLevel;
  isControl: boolean;
  /** When it starts, in percent of its parent. Absent: shared evenly with its siblings. */
  startPercent: number | null;
  /** How long it lasts, in percent of its parent. */
  durationPercent: number | null;
  labels: Translations;
  children: IPlanTemplateNode[];
}

export interface IPlanTemplate extends Omit<IPlanTemplateSummary, 'nodeCount'> {
  nodes: IPlanTemplateNode[];
}

export interface IOrganizationPlanNode {
  id: string;
  level: PlanNodeLevel;
  label: string;
  isControl: boolean;
  startPercent: number | null;
  durationPercent: number | null;
  children: IOrganizationPlanNode[];
}

export interface IOrganizationPlanSummary {
  id: string;
  sourceTemplateId: string | null;
  name: string;
  kind: WorksiteKind;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizationPlan extends IOrganizationPlanSummary {
  nodes: IOrganizationPlanNode[];
}

/** One line of a plan as the client sends it; its level comes from its depth. */
export interface IPlanNodeInput {
  label: string;
  isControl?: boolean;
  startPercent?: number | null;
  durationPercent?: number | null;
  children?: IPlanNodeInput[];
}

export interface ICreateOrganizationPlan {
  /** Copy this reference plan. Without it, the plan starts empty. */
  sourceTemplateId?: string;
  name?: string;
  kind?: WorksiteKind;
  /** The language to copy the reference labels in. French by default. */
  locale?: string;
}

export interface IUpdateOrganizationPlan {
  name?: string;
  kind?: WorksiteKind;
  /** The whole tree: what is sent replaces what was there. */
  nodes?: IPlanNodeInput[];
}
