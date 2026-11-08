import { ICreateAccessRequest } from '@chantia/shared';

export class CreateAccessRequestCommand {
  constructor(public readonly data: ICreateAccessRequest) {}
}
