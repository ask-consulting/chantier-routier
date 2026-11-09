import { Inject, Injectable } from "@nestjs/common";
import { PlanNodeLevel, WorksiteKind } from "@chantia/shared";
import { Prisma } from "@prisma/client";
import {
  TENANT_PRISMA,
  TenantPrismaClient,
} from "@shared/prisma/tenant-prisma.client";
import {
  OrganizationPlan,
  PlanNode,
} from "../../domain/entities/organization-plan.entity";
import { OrganizationPlanRepositoryPort } from "../../domain/ports/organization-plan-repository.port";

/** Far above what a firm keeps; only here so that a list stays bounded. */
const MAX_LISTED = 500;

interface NodeRow {
  id: string;
  parentId: string | null;
  level: string;
  label: string;
  isControl: boolean;
}

function treeOf(rows: readonly NodeRow[]): PlanNode[] {
  const byParent = new Map<string | null, NodeRow[]>();
  for (const row of rows) {
    byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row]);
  }
  const childrenOf = (parent: string | null): PlanNode[] =>
    (byParent.get(parent) ?? []).map((row) => ({
      id: row.id,
      level: row.level as PlanNodeLevel,
      label: row.label,
      isControl: row.isControl,
      children: childrenOf(row.id),
    }));
  return childrenOf(null);
}

function rowsOf(
  plan: OrganizationPlan,
): Prisma.OrganizationPlanNodeCreateManyInput[] {
  const rows: Prisma.OrganizationPlanNodeCreateManyInput[] = [];
  const visit = (nodes: readonly PlanNode[], parentId: string | null): void => {
    nodes.forEach((node, index) => {
      rows.push({
        id: node.id,
        organizationId: plan.organizationId,
        planId: plan.id,
        parentId,
        level: node.level,
        label: node.label,
        sortOrder: index + 1,
        isControl: node.isControl,
      });
      visit(node.children, node.id);
    });
  };
  visit(plan.nodes, null);
  return rows;
}

function toDomain(
  row: {
    id: string;
    organizationId: string;
    sourceTemplateCode: string | null;
    name: string;
    kind: string;
    createdAt: Date;
    updatedAt: Date;
  },
  nodes: PlanNode[],
): OrganizationPlan {
  return OrganizationPlan.create({
    ...row,
    kind: row.kind as WorksiteKind,
    nodes,
  });
}

/** The tenant filter sits on both tables: nothing here names an organization. */
@Injectable()
export class OrganizationPlanRepository implements OrganizationPlanRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient,
  ) {}

  async findAll(): Promise<OrganizationPlan[]> {
    const rows = await this.prisma.organizationPlan.findMany({
      orderBy: { name: "asc" },
      take: MAX_LISTED,
    });
    return rows.map((row) => toDomain(row, []));
  }

  async findById(id: string): Promise<OrganizationPlan | null> {
    const row = await this.prisma.organizationPlan.findUnique({
      where: { id },
      include: { nodes: { orderBy: { sortOrder: "asc" } } },
    });
    return row ? toDomain(row, treeOf(row.nodes)) : null;
  }

  async create(plan: OrganizationPlan): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationPlan.create({ data: this.planRow(plan) });
      await tx.organizationPlanNode.createMany({ data: rowsOf(plan) });
    });
  }

  async replace(plan: OrganizationPlan): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // The plan first, through the tenant filter: a plan of another
      // organization is not matched and the transaction stops here.
      await tx.organizationPlan.update({
        where: { id: plan.id },
        data: this.planRow(plan),
      });
      await tx.organizationPlanNode.deleteMany({ where: { planId: plan.id } });
      await tx.organizationPlanNode.createMany({ data: rowsOf(plan) });
    });
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.organizationPlan.deleteMany({
      where: { id },
    });
    return count > 0;
  }

  private planRow(
    plan: OrganizationPlan,
  ): Prisma.OrganizationPlanUncheckedCreateInput {
    return {
      id: plan.id,
      organizationId: plan.organizationId,
      sourceTemplateCode: plan.sourceTemplateCode,
      name: plan.name,
      kind: plan.kind,
    };
  }
}
