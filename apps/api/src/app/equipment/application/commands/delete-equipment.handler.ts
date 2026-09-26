import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Equipment } from '../../domain/entities/equipment.entity';
import { EquipmentStillAssignedException } from '../../domain/exceptions/equipment-assignment.exceptions';
import {
  EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
  EquipmentAssignmentRepositoryPort,
} from '../../domain/ports/equipment-assignment-repository.port';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { DeleteEquipmentCommand } from './delete-equipment.command';

/**
 * Removes a machine created by mistake — `deletedAt`, never a `DELETE`, like
 * the other aggregates: past assignments keep pointing here. A machine
 * sold or scrapped is not deleted; it is *retired*, with a disposal date, and
 * stays in the fleet's history.
 */
@CommandHandler(DeleteEquipmentCommand)
export class DeleteEquipmentHandler implements ICommandHandler<DeleteEquipmentCommand> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
    @Inject(EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT)
    private readonly assignments: EquipmentAssignmentRepositoryPort,
  ) {}

  async execute(command: DeleteEquipmentCommand): Promise<Equipment> {
    const equipment = await this.repository.findById(command.equipmentId);
    if (!equipment) {
      throw new ResourceNotFoundException('Equipment', command.equipmentId);
    }
    // Past assignments stay, and keep costing their worksites: the row
    // survives for them. Current and future ones would be bookings of a
    // machine nobody can see any more — they are cancelled first.
    const today = new Date().toISOString().slice(0, 10);
    const booked = await this.assignments.countEndingFrom(equipment.id, today);
    if (booked > 0) {
      throw new EquipmentStillAssignedException(booked);
    }

    return this.repository.save(equipment.deleted());
  }
}
