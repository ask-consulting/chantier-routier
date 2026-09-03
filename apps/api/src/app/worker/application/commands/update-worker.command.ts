import { IUpdateWorker } from '@chantia/shared';

export class UpdateWorkerCommand {
  constructor(
    public readonly workerId: string,
    public readonly data: IUpdateWorker,
  ) {}
}
