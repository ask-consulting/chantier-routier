export class CancelInvitationCommand {
  constructor(
    public readonly invitationId: string,
    /** From the caller's token: the tenant the invitation must belong to. */
    public readonly organizationId: string,
  ) {}
}
