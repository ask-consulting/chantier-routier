import { IInitializeWorksitePlan, IUpdateWorksiteTask } from '@chantia/shared';

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
