import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import {
  DeleteWorksitePlanHandler,
  GetWorksitePlanHandler,
  InitializeWorksitePlanHandler,
  UpdateWorksiteTaskHandler,
} from './application/worksite-plan.handlers';
import { PLAN_SOURCE_PORT } from './domain/ports/plan-source.port';
import { WORKSITE_PLAN_REPOSITORY_PORT } from './domain/ports/worksite-plan-repository.port';
import { PlanSourceRepository } from './infrastructure/repositories/plan-source.repository';
import { WorksitePlanRepository } from './infrastructure/repositories/worksite-plan.repository';
import {
  WorksitePlanController,
  WorksiteTaskController,
} from './presentation/controllers/worksite-plan.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [WorksitePlanController, WorksiteTaskController],
  providers: [
    GetWorksitePlanHandler,
    InitializeWorksitePlanHandler,
    DeleteWorksitePlanHandler,
    UpdateWorksiteTaskHandler,
    { provide: WORKSITE_PLAN_REPOSITORY_PORT, useClass: WorksitePlanRepository },
    { provide: PLAN_SOURCE_PORT, useClass: PlanSourceRepository },
  ],
})
export class PlanningModule {}
