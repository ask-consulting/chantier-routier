export class DeleteUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly actorId: string,
  ) {}
}
