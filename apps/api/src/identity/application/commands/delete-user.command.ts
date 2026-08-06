export class DeleteUserCommand {
  constructor(
    public readonly userId: string,
    public readonly actorId: string,
  ) {}
}
