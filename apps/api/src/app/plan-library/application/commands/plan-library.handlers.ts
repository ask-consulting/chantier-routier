import { randomUUID } from "node:crypto";
import { BadRequestException, Inject } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { IPlanTemplateNode, Translations, WorksiteKind } from "@chantia/shared";
import { ResourceNotFoundException } from "@shared/domain/exceptions/not-found.exception";
import {
  buildPlanNodes,
  OrganizationPlan,
  PlanNode,
} from "../../domain/entities/organization-plan.entity";
import {
  ORGANIZATION_PLAN_REPOSITORY_PORT,
  OrganizationPlanRepositoryPort,
} from "../../domain/ports/organization-plan-repository.port";
import {
  PLAN_TEMPLATE_CATALOG_PORT,
  PlanTemplateCatalogPort,
} from "../../domain/ports/plan-template-catalog.port";
import {
  CreateOrganizationPlanCommand,
  DeleteOrganizationPlanCommand,
  UpdateOrganizationPlanCommand,
} from "./plan-library.commands";

const DEFAULT_LOCALE = "fr";

const labelIn = (labels: Translations, locale: string): string =>
  labels[locale] ?? labels[DEFAULT_LOCALE] ?? "";

function copyNodes(
  nodes: readonly IPlanTemplateNode[],
  locale: string,
): PlanNode[] {
  return nodes.map((node) => ({
    id: randomUUID(),
    level: node.level,
    label: labelIn(node.labels, locale),
    isControl: node.isControl,
    children: copyNodes(node.children, locale),
  }));
}

/**
 * Starts a plan for the organization, empty or as a copy of a reference plan.
 * A copy and not a link, so that the reference stays the same for everybody.
 */
@CommandHandler(CreateOrganizationPlanCommand)
export class CreateOrganizationPlanHandler implements ICommandHandler<CreateOrganizationPlanCommand> {
  constructor(
    @Inject(ORGANIZATION_PLAN_REPOSITORY_PORT)
    private readonly repository: OrganizationPlanRepositoryPort,
    @Inject(PLAN_TEMPLATE_CATALOG_PORT)
    private readonly catalog: PlanTemplateCatalogPort,
  ) {}

  async execute({
    organizationId,
    data,
  }: CreateOrganizationPlanCommand): Promise<OrganizationPlan> {
    const locale = data.locale ?? DEFAULT_LOCALE;
    const template = data.sourceTemplateCode
      ? await this.catalog.findByCode(data.sourceTemplateCode)
      : null;
    if (data.sourceTemplateCode && !template) {
      throw new ResourceNotFoundException(
        "PlanTemplate",
        data.sourceTemplateCode,
      );
    }

    const name =
      data.name ?? (template ? labelIn(template.labels, locale) : "");
    if (name.trim() === "") {
      throw new BadRequestException("A plan needs a name.");
    }
    const plan = OrganizationPlan.create({
      organizationId,
      sourceTemplateCode: template?.code ?? null,
      name,
      kind: data.kind ?? template?.kind ?? WorksiteKind.OTHER,
      nodes: template ? copyNodes(template.nodes, locale) : [],
    });
    await this.repository.create(plan);
    return plan;
  }
}

@CommandHandler(UpdateOrganizationPlanCommand)
export class UpdateOrganizationPlanHandler implements ICommandHandler<UpdateOrganizationPlanCommand> {
  constructor(
    @Inject(ORGANIZATION_PLAN_REPOSITORY_PORT)
    private readonly repository: OrganizationPlanRepositoryPort,
  ) {}

  async execute({
    id,
    data,
  }: UpdateOrganizationPlanCommand): Promise<OrganizationPlan> {
    const plan = await this.repository.findById(id);
    if (!plan) {
      throw new ResourceNotFoundException("OrganizationPlan", id);
    }
    const revised = plan.revise({
      name: data.name,
      kind: data.kind,
      nodes: data.nodes ? buildPlanNodes(data.nodes) : undefined,
    });
    await this.repository.replace(revised);
    return revised;
  }
}

@CommandHandler(DeleteOrganizationPlanCommand)
export class DeleteOrganizationPlanHandler implements ICommandHandler<DeleteOrganizationPlanCommand> {
  constructor(
    @Inject(ORGANIZATION_PLAN_REPOSITORY_PORT)
    private readonly repository: OrganizationPlanRepositoryPort,
  ) {}

  async execute({ id }: DeleteOrganizationPlanCommand): Promise<void> {
    if (!(await this.repository.delete(id))) {
      throw new ResourceNotFoundException("OrganizationPlan", id);
    }
  }
}
