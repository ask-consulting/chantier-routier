export class GetWorksiteCostsQuery {
  constructor(
    public readonly organizationId: string,
    public readonly worksiteId: string,
  ) {}
}
