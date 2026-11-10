import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IMyWorksite,
  IWorksiteMember,
  summarizePlan,
  UserRole,
  WorksiteHealth,
} from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  InvalidWorksiteMembersException,
  TaskProgressFromChildrenException,
} from '../domain/exceptions/worksite-plan.exceptions';
import {
  WORKSITE_PLAN_REPOSITORY_PORT,
  WorksitePlanRepositoryPort,
} from '../domain/ports/worksite-plan-repository.port';
import {
  WORKSITE_TEAM_PORT,
  WorksiteTeamPort,
  WorksiteWithPlan,
} from '../domain/ports/worksite-team.port';
import {
  Caller,
  GetMyWorksiteQuery,
  GetMyWorksitesQuery,
  GetWorksiteMembersQuery,
  SetWorksiteMembersCommand,
  UpdateTaskProgressCommand,
} from './worksite-plan.messages';

/** An admin sees every worksite; everybody else, the ones they are a member of. */
const visibility = (caller: Caller) =>
  caller.role === UserRole.ADMIN ? {} : { memberOf: caller.id };

const HEALTH_ORDER: Record<WorksiteHealth, number> = { late: 0, control: 1, ok: 2 };

function toMyWorksite(worksite: WorksiteWithPlan, today: string): IMyWorksite {
  const { tasks, ...rest } = worksite;
  return { ...rest, ...summarizePlan(tasks, today) };
}

/** The worksites in progress the caller works on, those at risk first. */
@QueryHandler(GetMyWorksitesQuery)
export class GetMyWorksitesHandler implements IQueryHandler<GetMyWorksitesQuery> {
  constructor(@Inject(WORKSITE_TEAM_PORT) private readonly team: WorksiteTeamPort) {}

  async execute({ caller, today }: GetMyWorksitesQuery): Promise<IMyWorksite[]> {
    const worksites = await this.team.findVisible(visibility(caller));
    return worksites
      .map((worksite) => toMyWorksite(worksite, today))
      .sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]);
  }
}

/** One worksite, if the caller may see it: otherwise it does not exist for them. */
@QueryHandler(GetMyWorksiteQuery)
export class GetMyWorksiteHandler implements IQueryHandler<GetMyWorksiteQuery> {
  constructor(@Inject(WORKSITE_TEAM_PORT) private readonly team: WorksiteTeamPort) {}

  async execute({ caller, id, today }: GetMyWorksiteQuery): Promise<IMyWorksite> {
    const [worksite] = await this.team.findVisible({ ...visibility(caller), id });
    if (!worksite) {
      throw new ResourceNotFoundException('Worksite', id);
    }
    return toMyWorksite(worksite, today);
  }
}

/**
 * Enters the progress of a lowest line. On one's own worksites only, admin
 * aside: a line on another worksite does not exist for the caller.
 */
@CommandHandler(UpdateTaskProgressCommand)
export class UpdateTaskProgressHandler implements ICommandHandler<UpdateTaskProgressCommand> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT) private readonly plans: WorksitePlanRepositoryPort,
    @Inject(WORKSITE_TEAM_PORT) private readonly team: WorksiteTeamPort,
  ) {}

  async execute({ caller, id, progress }: UpdateTaskProgressCommand): Promise<void> {
    const shape = await this.plans.findTaskShape(id);
    const allowed =
      shape &&
      (caller.role === UserRole.ADMIN || (await this.team.isMember(shape.worksiteId, caller.id)));
    if (!shape || !allowed) {
      throw new ResourceNotFoundException('WorksiteTask', id);
    }
    if (shape.hasChildren) {
      throw new TaskProgressFromChildrenException();
    }
    await this.plans.updateProgress(id, progress);
  }
}

@QueryHandler(GetWorksiteMembersQuery)
export class GetWorksiteMembersHandler implements IQueryHandler<GetWorksiteMembersQuery> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT) private readonly plans: WorksitePlanRepositoryPort,
    @Inject(WORKSITE_TEAM_PORT) private readonly team: WorksiteTeamPort,
  ) {}

  async execute({ worksiteId }: GetWorksiteMembersQuery): Promise<IWorksiteMember[]> {
    if (!(await this.plans.findPeriod(worksiteId))) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    return this.team.listMembers(worksiteId);
  }
}

/** Sets who works on a worksite: the list sent replaces the one stored. */
@CommandHandler(SetWorksiteMembersCommand)
export class SetWorksiteMembersHandler implements ICommandHandler<SetWorksiteMembersCommand> {
  constructor(
    @Inject(WORKSITE_PLAN_REPOSITORY_PORT) private readonly plans: WorksitePlanRepositoryPort,
    @Inject(WORKSITE_TEAM_PORT) private readonly team: WorksiteTeamPort,
  ) {}

  async execute({ organizationId, worksiteId, userIds }: SetWorksiteMembersCommand): Promise<void> {
    if (!(await this.plans.findPeriod(worksiteId))) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }
    const unique = [...new Set(userIds)];
    if ((await this.team.findActiveUserIds(unique)).length !== unique.length) {
      throw new InvalidWorksiteMembersException();
    }
    await this.team.replaceMembers(organizationId, worksiteId, unique);
  }
}
