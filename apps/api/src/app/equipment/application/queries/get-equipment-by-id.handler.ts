import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Equipment } from '../../domain/entities/equipment.entity';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { GetEquipmentByIdQuery } from './get-equipment-by-id.query';

@QueryHandler(GetEquipmentByIdQuery)
export class GetEquipmentByIdHandler implements IQueryHandler<GetEquipmentByIdQuery> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
  ) {}

  async execute(query: GetEquipmentByIdQuery): Promise<Equipment> {
    // Not found rather than forbidden for another tenant's id.
    const equipment = await this.repository.findById(query.id);
    if (!equipment) {
      throw new ResourceNotFoundException('Equipment', query.id);
    }
    return equipment;
  }
}
