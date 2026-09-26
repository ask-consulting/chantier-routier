import { SearchParams } from '@shared/domain/search.types';

export class GetEquipmentAssignmentsQuery {
  constructor(public readonly params: SearchParams) {}
}
