import { IUpdateUser } from '@chantia/shared';

export class UpdateUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly data: IUpdateUser,
    /** The admin performing the change — used to block self-lockout. */
    public readonly actorId: string,
  ) {}
}
