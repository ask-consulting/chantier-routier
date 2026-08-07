import { ICreateUser } from '@chantia/shared';

/** An admin inviting somebody into their own organization. */
export class InviteUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateUser,
    /** Recorded on the invitation as its audit trail. */
    public readonly invitedById: string,
  ) {}
}
