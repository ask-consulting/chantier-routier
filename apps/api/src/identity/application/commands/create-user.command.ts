import { ICreateUser } from '@chantia/shared';

/** An admin adding an account inside their own organization. */
export class CreateUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateUser,
  ) {}
}
