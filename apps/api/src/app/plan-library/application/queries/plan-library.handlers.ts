import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IPlanTemplate, IPlanTemplateSummary } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { OrganizationPlan } from '../../domain/entities/organization-plan.entity';
import {
  ORGANIZATION_PLAN_REPOSITORY_PORT,
  OrganizationPlanRepositoryPort,
} from '../../domain/ports/organization-plan-repository.port';
import {
  PLAN_TEMPLATE_CATALOG_PORT,
  PlanTemplateCatalogPort,
} from '../../domain/ports/plan-template-catalog.port';
import {
  GetOrganizationPlanQuery,
  GetOrganizationPlansQuery,
  GetPlanTemplateQuery,
  GetPlanTemplatesQuery,
} from './plan-library.queries';

@QueryHandler(GetPlanTemplatesQuery)
export class GetPlanTemplatesHandler implements IQueryHandler<GetPlanTemplatesQuery> {
  constructor(
    @Inject(PLAN_TEMPLATE_CATALOG_PORT)
    private readonly catalog: PlanTemplateCatalogPort,
  ) {}

  async execute(): Promise<IPlanTemplateSummary[]> {
    return this.catalog.list();
  }
}

@QueryHandler(GetPlanTemplateQuery)
export class GetPlanTemplateHandler implements IQueryHandler<GetPlanTemplateQuery> {
  constructor(
    @Inject(PLAN_TEMPLATE_CATALOG_PORT)
    private readonly catalog: PlanTemplateCatalogPort,
  ) {}

  async execute(query: GetPlanTemplateQuery): Promise<IPlanTemplate> {
    const template = await this.catalog.findById(query.id);
    if (!template) {
      throw new ResourceNotFoundException('PlanTemplate', query.id);
    }
    return template;
  }
}

@QueryHandler(GetOrganizationPlansQuery)
export class GetOrganizationPlansHandler implements IQueryHandler<GetOrganizationPlansQuery> {
  constructor(
    @Inject(ORGANIZATION_PLAN_REPOSITORY_PORT)
    private readonly repository: OrganizationPlanRepositoryPort,
  ) {}

  async execute(): Promise<OrganizationPlan[]> {
    return this.repository.findAll();
  }
}

@QueryHandler(GetOrganizationPlanQuery)
export class GetOrganizationPlanHandler implements IQueryHandler<GetOrganizationPlanQuery> {
  constructor(
    @Inject(ORGANIZATION_PLAN_REPOSITORY_PORT)
    private readonly repository: OrganizationPlanRepositoryPort,
  ) {}

  async execute(query: GetOrganizationPlanQuery): Promise<OrganizationPlan> {
    const plan = await this.repository.findById(query.id);
    if (!plan) {
      throw new ResourceNotFoundException('OrganizationPlan', query.id);
    }
    return plan;
  }
}
