import { ICreateWorksite } from '@chantier/shared';

export class CreateWorksiteCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateWorksite,
  ) {}
}
