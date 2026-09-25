import { IUpdateWorksite } from '@chantia/shared';

export class UpdateWorksiteCommand {
  constructor(
    public readonly worksiteId: string,
    public readonly data: IUpdateWorksite,
  ) {}
}
