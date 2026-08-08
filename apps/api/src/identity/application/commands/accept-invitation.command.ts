export class AcceptInvitationCommand {
  constructor(
    public readonly token: string,
    public readonly password: string,
    public readonly userAgent: string | null,
  ) {}
}
