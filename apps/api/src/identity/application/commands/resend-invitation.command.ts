export class ResendInvitationCommand {
  constructor(
    public readonly invitationId: string,
    /** From the caller's token: the tenant the invitation must belong to. */
    public readonly organizationId: string,
    /** Who asked. Recorded on the new invitation, like the first one. */
    public readonly requestedById: string,
  ) {}
}
