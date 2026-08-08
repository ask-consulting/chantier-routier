import { SearchParams } from '@shared/domain/search.types';

export class GetWorksitesQuery {
  constructor(public readonly params: SearchParams) {}
}
