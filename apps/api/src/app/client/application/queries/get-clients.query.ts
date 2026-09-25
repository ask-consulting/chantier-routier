import { SearchParams } from '@shared/domain/search.types';

export class GetClientsQuery {
  constructor(public readonly params: SearchParams) {}
}
