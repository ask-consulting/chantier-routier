import { IAssignTaskWorker } from '@chantia/shared';

export class GetTaskTeamQuery {
  constructor(
    public readonly worksiteId: string,
    /** Whether the caller may read budgets: rates are money. */
    public readonly withRates: boolean,
  ) {}
}

export class AssignTaskWorkerCommand {
  constructor(
    public readonly organizationId: string,
    public readonly taskId: string,
    public readonly data: IAssignTaskWorker,
  ) {}
}

export class RemoveTaskWorkerCommand {
  constructor(public readonly id: string) {}
}

export class LinkTaskEquipmentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly taskId: string,
    public readonly equipmentAssignmentId: string,
  ) {}
}

export class UnlinkTaskEquipmentCommand {
  constructor(public readonly id: string) {}
}
