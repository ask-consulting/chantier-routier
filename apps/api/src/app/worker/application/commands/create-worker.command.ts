import { ICreateWorker } from '@chantia/shared';

export class CreateWorkerCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateWorker,
  ) {}
}
