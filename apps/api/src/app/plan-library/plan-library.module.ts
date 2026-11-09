import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import {
  CreateOrganizationPlanHandler,
  DeleteOrganizationPlanHandler,
  UpdateOrganizationPlanHandler,
} from './application/commands/plan-library.handlers';
import {
  GetOrganizationPlanHandler,
  GetOrganizationPlansHandler,
  GetPlanTemplateHandler,
  GetPlanTemplatesHandler,
} from './application/queries/plan-library.handlers';
import { ORGANIZATION_PLAN_REPOSITORY_PORT } from './domain/ports/organization-plan-repository.port';
import { PLAN_TEMPLATE_CATALOG_PORT } from './domain/ports/plan-template-catalog.port';
import { OrganizationPlanRepository } from './infrastructure/repositories/organization-plan.repository';
import { PlanTemplateCatalogRepository } from './infrastructure/repositories/plan-template-catalog.repository';
import { OrganizationPlanController } from './presentation/controllers/organization-plan.controller';
import { PlanTemplateController } from './presentation/controllers/plan-template.controller';

const Handlers = [
  GetPlanTemplatesHandler,
  GetPlanTemplateHandler,
  GetOrganizationPlansHandler,
  GetOrganizationPlanHandler,
  CreateOrganizationPlanHandler,
  UpdateOrganizationPlanHandler,
  DeleteOrganizationPlanHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [PlanTemplateController, OrganizationPlanController],
  providers: [
    ...Handlers,
    {
      provide: PLAN_TEMPLATE_CATALOG_PORT,
      useClass: PlanTemplateCatalogRepository,
    },
    {
      provide: ORGANIZATION_PLAN_REPOSITORY_PORT,
      useClass: OrganizationPlanRepository,
    },
  ],
})
export class PlanLibraryModule {}
