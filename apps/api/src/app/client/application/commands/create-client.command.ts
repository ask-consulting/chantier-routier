import { ICreateClient } from '@chantia/shared';

export class CreateClientCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateClient,
  ) {}
}
