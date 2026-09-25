import { SearchParams } from '@shared/domain/search.types';

export class GetEquipmentListQuery {
  constructor(public readonly params: SearchParams) {}
}
