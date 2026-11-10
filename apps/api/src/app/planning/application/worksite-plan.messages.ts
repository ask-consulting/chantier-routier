import { IInitializeWorksitePlan, IUpdateWorksiteTask, UserRole } from '@chantia/shared';

/** Who is asking: what decides which worksites they see. */
export interface Caller {
  id: string;
  role: UserRole;
}

export class GetWorksitePlanQuery {
  constructor(public readonly worksiteId: string) {}
}

export class InitializeWorksitePlanCommand {
  constructor(
    public readonly organizationId: string,
    public readonly worksiteId: string,
    public readonly data: IInitializeWorksitePlan,
  ) {}
}

export class DeleteWorksitePlanCommand {
  constructor(public readonly worksiteId: string) {}
}

export class UpdateWorksiteTaskCommand {
  constructor(
    public readonly id: string,
    public readonly data: IUpdateWorksiteTask,
  ) {}
}

export class UpdateTaskProgressCommand {
  constructor(
    public readonly caller: Caller,
    public readonly id: string,
    public readonly progress: number,
  ) {}
}

export class GetWorksiteMembersQuery {
  constructor(public readonly worksiteId: string) {}
}

export class SetWorksiteMembersCommand {
  constructor(
    public readonly organizationId: string,
    public readonly worksiteId: string,
    public readonly userIds: string[],
  ) {}
}

export class GetMyWorksitesQuery {
  constructor(
    public readonly caller: Caller,
    public readonly today: string,
  ) {}
}

export class GetMyWorksiteQuery {
  constructor(
    public readonly caller: Caller,
    public readonly id: string,
    public readonly today: string,
  ) {}
}
