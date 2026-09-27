import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchResult } from '@shared/domain/search.types';
import { EquipmentAssignment } from '../../domain/entities/equipment-assignment.entity';
import {
  EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
  EquipmentAssignmentRepositoryPort,
} from '../../domain/ports/equipment-assignment-repository.port';
import { GetEquipmentAssignmentsQuery } from './get-equipment-assignments.query';

@QueryHandler(GetEquipmentAssignmentsQuery)
export class GetEquipmentAssignmentsHandler implements IQueryHandler<GetEquipmentAssignmentsQuery> {
  constructor(
    @Inject(EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT)
    private readonly assignments: EquipmentAssignmentRepositoryPort,
  ) {}

  async execute(query: GetEquipmentAssignmentsQuery): Promise<SearchResult<EquipmentAssignment>> {
    return this.assignments.search(query.params);
  }
}
