import { SearchParams } from '@shared/domain/search.types';

export class GetUsersQuery {
  constructor(
    public readonly organizationId: string,
    public readonly params: SearchParams,
  ) {}
}
