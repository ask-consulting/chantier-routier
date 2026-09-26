import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchResult } from '@shared/domain/search.types';
import { Equipment } from '../../domain/entities/equipment.entity';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { GetEquipmentListQuery } from './get-equipment-list.query';

@QueryHandler(GetEquipmentListQuery)
export class GetEquipmentListHandler implements IQueryHandler<GetEquipmentListQuery> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
  ) {}

  async execute(query: GetEquipmentListQuery): Promise<SearchResult<Equipment>> {
    return this.repository.search(query.params);
  }
}
