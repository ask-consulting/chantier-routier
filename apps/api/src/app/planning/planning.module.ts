import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import {
  DeleteWorksitePlanHandler,
  GetWorksitePlanHandler,
  InitializeWorksitePlanHandler,
  UpdateWorksiteTaskHandler,
} from './application/worksite-plan.handlers';
import {
  GetMyWorksiteHandler,
  GetMyWorksitesHandler,
  GetWorksiteMembersHandler,
  SetWorksiteMembersHandler,
  UpdateTaskProgressHandler,
} from './application/worksite-team.handlers';
import {
  AssignTaskWorkerHandler,
  GetTaskTeamHandler,
  LinkTaskEquipmentHandler,
  RemoveTaskWorkerHandler,
  UnlinkTaskEquipmentHandler,
} from './application/task-team.handlers';
import { PLAN_SOURCE_PORT } from './domain/ports/plan-source.port';
import { TASK_TEAM_PORT } from './domain/ports/task-team.port';
import { WORKSITE_TEAM_PORT } from './domain/ports/worksite-team.port';
import { WORKSITE_PLAN_REPOSITORY_PORT } from './domain/ports/worksite-plan-repository.port';
import { PlanSourceRepository } from './infrastructure/repositories/plan-source.repository';
import { WorksitePlanRepository } from './infrastructure/repositories/worksite-plan.repository';
import { TaskTeamRepository } from './infrastructure/repositories/task-team.repository';
import { WorksiteTeamRepository } from './infrastructure/repositories/worksite-team.repository';
import { TaskTeamController } from './presentation/controllers/task-team.controller';
import {
  MyWorksitesController,
  WorksiteMembersController,
} from './presentation/controllers/my-worksites.controller';
import {
  WorksitePlanController,
  WorksiteTaskController,
} from './presentation/controllers/worksite-plan.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [
    WorksitePlanController,
    WorksiteTaskController,
    MyWorksitesController,
    WorksiteMembersController,
    TaskTeamController,
  ],
  providers: [
    GetWorksitePlanHandler,
    InitializeWorksitePlanHandler,
    DeleteWorksitePlanHandler,
    UpdateWorksiteTaskHandler,
    GetMyWorksitesHandler,
    GetMyWorksiteHandler,
    UpdateTaskProgressHandler,
    GetWorksiteMembersHandler,
    SetWorksiteMembersHandler,
    GetTaskTeamHandler,
    AssignTaskWorkerHandler,
    RemoveTaskWorkerHandler,
    LinkTaskEquipmentHandler,
    UnlinkTaskEquipmentHandler,
    { provide: WORKSITE_TEAM_PORT, useClass: WorksiteTeamRepository },
    { provide: TASK_TEAM_PORT, useClass: TaskTeamRepository },
    { provide: WORKSITE_PLAN_REPOSITORY_PORT, useClass: WorksitePlanRepository },
    { provide: PLAN_SOURCE_PORT, useClass: PlanSourceRepository },
  ],
})
export class PlanningModule {}
