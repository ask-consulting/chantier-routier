import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ITaskMaterial, PlanNodeLevel } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  AlreadyOnTaskException,
  TaskNotAssignableException,
  UnknownMaterialException,
} from '../domain/exceptions/worksite-plan.exceptions';
import { TASK_MATERIALS_PORT, TaskMaterialsPort } from '../domain/ports/task-materials.port';
import {
  WORKSITE_PLAN_REPOSITORY_PORT,
  WorksitePlanRepositoryPort,
} from '../domain/ports/worksite-plan-repository.port';
import {
  GetTaskMaterialsQuery,
  PlanTaskMaterialCommand,
  RemoveTaskMaterialCommand,
  UpdateTaskMaterialCommand,
} from './task-materials.messages';

@QueryHandler(GetTaskMaterialsQuery)
export class GetTaskMaterialsHandler implements IQueryHandler<GetTaskMaterialsQuery> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT) private readonly plans: WorksitePlanRepositoryPort,
    @Inject(TASK_MATERIALS_PORT) private readonly materials: TaskMaterialsPort,
  ) {}

  async execute({ worksiteId, withPrices }: GetTaskMaterialsQuery): Promise<ITaskMaterial[]> {
    if (!(await this.plans.findPeriod(worksiteId))) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    const needs = await this.materials.findForWorksite(worksiteId);
    return withPrices
      ? needs
      : needs.map(({ unitPrice: _price, plannedCost: _cost, ...need }) => need);
  }
}

/**
 * Plans how much of one material a task needs. A phase holds none: it only
 * adds up the lines under it, like it does for people and machines.
 */
@CommandHandler(PlanTaskMaterialCommand)
export class PlanTaskMaterialHandler implements ICommandHandler<PlanTaskMaterialCommand> {
  constructor(@Inject(TASK_MATERIALS_PORT) private readonly materials: TaskMaterialsPort) {}

  async execute({ organizationId, taskId, data }: PlanTaskMaterialCommand): Promise<ITaskMaterial> {
    const task = await this.materials.findTask(taskId);
    if (!task) {
      throw new ResourceNotFoundException('WorksiteTask', taskId);
    }
    if (task.level === PlanNodeLevel.PHASE) {
      throw new TaskNotAssignableException();
    }
    const material = await this.materials.resolveMaterial(data.materialId);
    if (!material) {
      throw new UnknownMaterialException();
    }
    if (await this.materials.isPlanned(taskId, material)) {
      throw new AlreadyOnTaskException('materialId');
    }
    return this.materials.add({
      organizationId,
      taskId,
      material,
      quantity: data.quantity,
      unitPrice: data.unitPrice ?? null,
    });
  }
}

@CommandHandler(UpdateTaskMaterialCommand)
export class UpdateTaskMaterialHandler implements ICommandHandler<UpdateTaskMaterialCommand> {
  constructor(@Inject(TASK_MATERIALS_PORT) private readonly materials: TaskMaterialsPort) {}

  async execute({ id, data }: UpdateTaskMaterialCommand): Promise<ITaskMaterial> {
    const updated = await this.materials.update(id, data);
    if (!updated) {
      throw new ResourceNotFoundException('TaskMaterial', id);
    }
    return updated;
  }
}

@CommandHandler(RemoveTaskMaterialCommand)
export class RemoveTaskMaterialHandler implements ICommandHandler<RemoveTaskMaterialCommand> {
  constructor(@Inject(TASK_MATERIALS_PORT) private readonly materials: TaskMaterialsPort) {}

  async execute({ id }: RemoveTaskMaterialCommand): Promise<void> {
    if (!(await this.materials.remove(id))) {
      throw new ResourceNotFoundException('TaskMaterial', id);
    }
  }
}
