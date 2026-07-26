import { ICreateWorksite } from '@chantia/shared';

export class CreateWorksiteCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateWorksite,
  ) {}
}
