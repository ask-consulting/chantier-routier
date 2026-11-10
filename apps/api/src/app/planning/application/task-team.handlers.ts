import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { defaultTaskRate, ITaskTeam, ITaskWorker, PlanNodeLevel } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  AlreadyOnTaskException,
  EquipmentNotOnWorksiteException,
  TaskNotAssignableException,
  TaskRateRequiredException,
  WorkerNotAvailableException,
} from '../domain/exceptions/worksite-plan.exceptions';
import { TASK_TEAM_PORT, TaskTeamPort } from '../domain/ports/task-team.port';
import {
  WORKSITE_PLAN_REPOSITORY_PORT,
  WorksitePlanRepositoryPort,
} from '../domain/ports/worksite-plan-repository.port';
import {
  AssignTaskWorkerCommand,
  GetTaskTeamQuery,
  LinkTaskEquipmentCommand,
  RemoveTaskWorkerCommand,
  UnlinkTaskEquipmentCommand,
} from './task-team.messages';

/** A task or a subtask of the caller's: a phase only adds up the lines under it. */
async function assignableTask(team: TaskTeamPort, taskId: string) {
  const task = await team.findTask(taskId);
  if (!task) {
    throw new ResourceNotFoundException('WorksiteTask', taskId);
  }
  if (task.level === PlanNodeLevel.PHASE) {
    throw new TaskNotAssignableException();
  }
  return task;
}

@QueryHandler(GetTaskTeamQuery)
export class GetTaskTeamHandler implements IQueryHandler<GetTaskTeamQuery> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT) private readonly plans: WorksitePlanRepositoryPort,
    @Inject(TASK_TEAM_PORT) private readonly team: TaskTeamPort,
  ) {}

  async execute({ worksiteId, withRates }: GetTaskTeamQuery): Promise<ITaskTeam> {
    if (!(await this.plans.findPeriod(worksiteId))) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    const team = await this.team.findTeam(worksiteId);
    return withRates
      ? team
      : { ...team, workers: team.workers.map(({ rate: _money, ...worker }) => worker) };
  }
}

/**
 * Puts a worker on a task, with how they are paid for it. The rate is frozen
 * now: a raise later does not rewrite what this task costs.
 */
@CommandHandler(AssignTaskWorkerCommand)
export class AssignTaskWorkerHandler implements ICommandHandler<AssignTaskWorkerCommand> {
  constructor(@Inject(TASK_TEAM_PORT) private readonly team: TaskTeamPort) {}

  async execute({ organizationId, taskId, data }: AssignTaskWorkerCommand): Promise<ITaskWorker> {
    await assignableTask(this.team, taskId);
    const worker = await this.team.findActiveWorker(data.workerId);
    if (!worker) {
      throw new WorkerNotAvailableException();
    }
    if (await this.team.isWorkerOnTask(taskId, data.workerId)) {
      throw new AlreadyOnTaskException('workerId');
    }
    const rate = data.rate ?? defaultTaskRate(data.payMode, worker.hourlyRate);
    if (rate === null) {
      throw new TaskRateRequiredException();
    }
    return this.team.addWorker({
      organizationId,
      taskId,
      workerId: data.workerId,
      payMode: data.payMode,
      rate,
    });
  }
}

@CommandHandler(RemoveTaskWorkerCommand)
export class RemoveTaskWorkerHandler implements ICommandHandler<RemoveTaskWorkerCommand> {
  constructor(@Inject(TASK_TEAM_PORT) private readonly team: TaskTeamPort) {}

  async execute({ id }: RemoveTaskWorkerCommand): Promise<void> {
    if (!(await this.team.removeWorker(id))) {
      throw new ResourceNotFoundException('TaskWorker', id);
    }
  }
}

/** Puts one of the machines booked on the worksite on one of its tasks. */
@CommandHandler(LinkTaskEquipmentCommand)
export class LinkTaskEquipmentHandler implements ICommandHandler<LinkTaskEquipmentCommand> {
  constructor(@Inject(TASK_TEAM_PORT) private readonly team: TaskTeamPort) {}

  async execute({
    organizationId,
    taskId,
    equipmentAssignmentId,
  }: LinkTaskEquipmentCommand): Promise<void> {
    const task = await assignableTask(this.team, taskId);
    const booking = await this.team.findEquipmentAssignment(equipmentAssignmentId);
    if (!booking || booking.worksiteId !== task.worksiteId) {
      throw new EquipmentNotOnWorksiteException();
    }
    if (await this.team.isEquipmentOnTask(taskId, equipmentAssignmentId)) {
      throw new AlreadyOnTaskException('equipmentAssignmentId');
    }
    await this.team.linkEquipment(organizationId, taskId, equipmentAssignmentId);
  }
}

@CommandHandler(UnlinkTaskEquipmentCommand)
export class UnlinkTaskEquipmentHandler implements ICommandHandler<UnlinkTaskEquipmentCommand> {
  constructor(@Inject(TASK_TEAM_PORT) private readonly team: TaskTeamPort) {}

  async execute({ id }: UnlinkTaskEquipmentCommand): Promise<void> {
    if (!(await this.team.unlinkEquipment(id))) {
      throw new ResourceNotFoundException('TaskEquipment', id);
    }
  }
}
