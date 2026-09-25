import { IUpdateClient } from '@chantia/shared';

export class UpdateClientCommand {
  constructor(
    public readonly clientId: string,
    public readonly data: IUpdateClient,
  ) {}
}
