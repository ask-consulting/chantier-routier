import { PlanNodeLevel, WorksiteKind } from "../enums/plan.enums";
import { Translations } from "./equipment.interface";

/** A reference plan as listed: enough to choose one without loading its tree. */
export interface IPlanTemplateSummary {
  code: string;
  kind: WorksiteKind;
  labels: Translations;
  nodeCount: number;
}

export interface IPlanTemplateNode {
  code: string;
  level: PlanNodeLevel;
  isControl: boolean;
  labels: Translations;
  children: IPlanTemplateNode[];
}

export interface IPlanTemplate extends Omit<IPlanTemplateSummary, "nodeCount"> {
  nodes: IPlanTemplateNode[];
}

export interface IOrganizationPlanNode {
  id: string;
  level: PlanNodeLevel;
  label: string;
  isControl: boolean;
  children: IOrganizationPlanNode[];
}

export interface IOrganizationPlanSummary {
  id: string;
  sourceTemplateCode: string | null;
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
  children?: IPlanNodeInput[];
}

export interface ICreateOrganizationPlan {
  /** Copy this reference plan. Without it, the plan starts empty. */
  sourceTemplateCode?: string;
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
