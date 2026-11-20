import { IPlanTaskMaterial, IUpdateTaskMaterial } from '@chantia/shared';

export class GetTaskMaterialsQuery {
  constructor(
    public readonly worksiteId: string,
    /** Whether the caller may read budgets: prices are money. */
    public readonly withPrices: boolean,
  ) {}
}

export class PlanTaskMaterialCommand {
  constructor(
    public readonly organizationId: string,
    public readonly taskId: string,
    public readonly data: IPlanTaskMaterial,
  ) {}
}

export class UpdateTaskMaterialCommand {
  constructor(
    public readonly id: string,
    public readonly data: IUpdateTaskMaterial,
  ) {}
}

export class RemoveTaskMaterialCommand {
  constructor(public readonly id: string) {}
}
