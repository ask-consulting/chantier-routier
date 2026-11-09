import { randomUUID } from "node:crypto";
import { IPlanNodeInput, PlanNodeLevel, WorksiteKind } from "@chantia/shared";

/** Above this a plan is no longer something a person reads; it is a mistake. */
export const MAX_PLAN_NODES = 2000;

const LEVELS = [PlanNodeLevel.PHASE, PlanNodeLevel.TASK, PlanNodeLevel.SUBTASK];

export interface PlanNode {
  id: string;
  level: PlanNodeLevel;
  label: string;
  isControl: boolean;
  children: PlanNode[];
}

export interface OrganizationPlanProps {
  id?: string;
  organizationId: string;
  sourceTemplateCode: string | null;
  name: string;
  kind: WorksiteKind;
  nodes: PlanNode[];
  createdAt?: Date;
  updatedAt?: Date;
}

/** Gives each line an id and takes its level from its depth, three at most. */
export function buildPlanNodes(
  inputs: readonly IPlanNodeInput[],
  depth = 0,
): PlanNode[] {
  if (inputs.length === 0) {
    return [];
  }
  const level = LEVELS[depth];
  if (!level) {
    throw new Error("A plan has three levels: phase, task and subtask.");
  }
  return inputs.map((input) => ({
    id: randomUUID(),
    level,
    label: input.label.trim(),
    isControl: input.isControl ?? false,
    children: buildPlanNodes(input.children ?? [], depth + 1),
  }));
}

export function countPlanNodes(nodes: readonly PlanNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countPlanNodes(node.children),
    0,
  );
}

/** An organization's own plan: the part of the library it can change. */
export class OrganizationPlan {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly sourceTemplateCode: string | null,
    public readonly name: string,
    public readonly kind: WorksiteKind,
    public readonly nodes: PlanNode[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: OrganizationPlanProps): OrganizationPlan {
    const name = props.name.trim();
    if (name === "") {
      throw new Error("A plan needs a name.");
    }
    if (countPlanNodes(props.nodes) > MAX_PLAN_NODES) {
      throw new Error(`A plan cannot have more than ${MAX_PLAN_NODES} lines.`);
    }
    const now = new Date();
    return new OrganizationPlan(
      props.id ?? randomUUID(),
      props.organizationId,
      props.sourceTemplateCode,
      name,
      props.kind,
      props.nodes,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  /** Renames or reclassifies it, or replaces its whole tree. */
  revise(changes: {
    name?: string;
    kind?: WorksiteKind;
    nodes?: PlanNode[];
  }): OrganizationPlan {
    return OrganizationPlan.create({
      id: this.id,
      organizationId: this.organizationId,
      sourceTemplateCode: this.sourceTemplateCode,
      name: changes.name ?? this.name,
      kind: changes.kind ?? this.kind,
      nodes: changes.nodes ?? this.nodes,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}
