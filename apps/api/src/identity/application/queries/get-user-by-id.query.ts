export class GetUserByIdQuery {
  constructor(
    /** Tenant of the caller — the lookup never crosses it. */
    public readonly organizationId: string,
    public readonly userId: string,
  ) {}
}
