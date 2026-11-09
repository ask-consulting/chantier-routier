import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IWorksitePlan, PlanNodeLevel, proposeSchedule, rollUpSchedule } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  InvalidPlanSourceException,
  InvalidTaskDatesException,
  TaskDatesFromChildrenException,
  WorksitePeriodRequiredException,
  WorksitePlanExistsException,
} from '../domain/exceptions/worksite-plan.exceptions';
import { NewTask, SourceNode, SourcePlan } from '../domain/plan-tree';
import { PLAN_SOURCE_PORT, PlanSourcePort } from '../domain/ports/plan-source.port';
import {
  WORKSITE_PLAN_REPOSITORY_PORT,
  WorksitePlanRepositoryPort,
} from '../domain/ports/worksite-plan-repository.port';
import {
  DeleteWorksitePlanCommand,
  GetWorksitePlanQuery,
  InitializeWorksitePlanCommand,
  UpdateWorksiteTaskCommand,
} from './worksite-plan.messages';

const LEVELS = [PlanNodeLevel.PHASE, PlanNodeLevel.TASK, PlanNodeLevel.SUBTASK];
const DEFAULT_LOCALE = 'fr';

@QueryHandler(GetWorksitePlanQuery)
export class GetWorksitePlanHandler implements IQueryHandler<GetWorksitePlanQuery> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT)
    private readonly repository: WorksitePlanRepositoryPort,
  ) {}

  async execute({ worksiteId }: GetWorksitePlanQuery): Promise<IWorksitePlan> {
    if (!(await this.repository.findPeriod(worksiteId))) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    return { tasks: rollUpSchedule(await this.repository.findTree(worksiteId)) };
  }
}

function flatten(
  nodes: readonly SourceNode[],
  dates: ReturnType<typeof proposeSchedule<SourceNode>>,
): NewTask[] {
  const tasks: NewTask[] = [];
  const visit = (children: readonly SourceNode[], parentId: string | null, depth: number): void => {
    children.forEach((node, index) => {
      const id = randomUUID();
      const planned = dates.get(node);
      tasks.push({
        id,
        parentId,
        level: LEVELS[depth] ?? PlanNodeLevel.SUBTASK,
        label: node.label,
        sortOrder: index + 1,
        isControl: node.isControl,
        sourceCode: node.code,
        plannedStart: planned?.plannedStart ?? null,
        plannedEnd: planned?.plannedEnd ?? null,
      });
      visit(node.children, id, depth + 1);
    });
  };
  visit(nodes, null, 0);
  return tasks;
}

/**
 * Starts a worksite's planning from a plan of the library. A copy: the source
 * can change afterwards without touching a planning already under way.
 */
@CommandHandler(InitializeWorksitePlanCommand)
export class InitializeWorksitePlanHandler implements ICommandHandler<InitializeWorksitePlanCommand> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT)
    private readonly repository: WorksitePlanRepositoryPort,
    @Inject(PLAN_SOURCE_PORT) private readonly sources: PlanSourcePort,
  ) {}

  async execute({
    organizationId,
    worksiteId,
    data,
  }: InitializeWorksitePlanCommand): Promise<IWorksitePlan> {
    if (Boolean(data.templateId) === Boolean(data.organizationPlanId)) {
      throw new InvalidPlanSourceException();
    }
    const period = await this.repository.findPeriod(worksiteId);
    if (!period) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    if (!period.start || !period.end) {
      throw new WorksitePeriodRequiredException();
    }

    const source = await this.findSource(data.templateId, data.organizationPlanId, data.locale);
    const dates = proposeSchedule(source.nodes, period.start, period.end);
    const created = await this.repository.createIfEmpty(
      organizationId,
      worksiteId,
      flatten(source.nodes, dates),
    );
    if (!created) {
      throw new WorksitePlanExistsException();
    }
    return { tasks: rollUpSchedule(await this.repository.findTree(worksiteId)) };
  }

  private async findSource(
    templateId: string | undefined,
    organizationPlanId: string | undefined,
    locale: string | undefined,
  ): Promise<SourcePlan> {
    const source = templateId
      ? await this.sources.findTemplate(templateId, locale ?? DEFAULT_LOCALE)
      : await this.sources.findOrganizationPlan(organizationPlanId as string);
    if (!source) {
      throw new ResourceNotFoundException('Plan', templateId ?? (organizationPlanId as string));
    }
    return source;
  }
}

@CommandHandler(DeleteWorksitePlanCommand)
export class DeleteWorksitePlanHandler implements ICommandHandler<DeleteWorksitePlanCommand> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT)
    private readonly repository: WorksitePlanRepositoryPort,
  ) {}

  async execute({ worksiteId }: DeleteWorksitePlanCommand): Promise<void> {
    if (!(await this.repository.findPeriod(worksiteId))) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    await this.repository.deleteAll(worksiteId);
  }
}

/** Moves a lowest line. Nothing keeps it inside the worksite: an overrun is a fact to show. */
@CommandHandler(UpdateWorksiteTaskCommand)
export class UpdateWorksiteTaskHandler implements ICommandHandler<UpdateWorksiteTaskCommand> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT)
    private readonly repository: WorksitePlanRepositoryPort,
  ) {}

  async execute({ id, data }: UpdateWorksiteTaskCommand): Promise<void> {
    if (data.plannedEnd < data.plannedStart) {
      throw new InvalidTaskDatesException();
    }
    const shape = await this.repository.findTaskShape(id);
    if (!shape) {
      throw new ResourceNotFoundException('WorksiteTask', id);
    }
    if (shape.hasChildren) {
      throw new TaskDatesFromChildrenException();
    }
    await this.repository.updateDates(id, data.plannedStart, data.plannedEnd);
  }
}
