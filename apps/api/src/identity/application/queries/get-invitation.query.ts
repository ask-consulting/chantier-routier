/** Reads an invitation for display, before any password is chosen. */
export class GetInvitationQuery {
  constructor(public readonly token: string) {}
}
