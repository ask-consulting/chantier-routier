export class GetWorksiteByIdQuery {
  constructor(
    /** Tenant of the caller — a worksite of another organization reads as absent. */
    public readonly organizationId: string,
    public readonly id: string,
  ) {}
}
