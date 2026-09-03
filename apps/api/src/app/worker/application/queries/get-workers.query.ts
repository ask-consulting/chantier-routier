import { SearchParams } from '@shared/domain/search.types';

export class GetWorkersQuery {
  constructor(public readonly params: SearchParams) {}
}
