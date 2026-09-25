import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Equipment } from '../../domain/entities/equipment.entity';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { DeleteEquipmentCommand } from './delete-equipment.command';

/**
 * Removes a machine created by mistake — `deletedAt`, never a `DELETE`, like
 * the other aggregates: assignments to worksites will point here. A machine
 * sold or scrapped is not deleted; it is *retired*, with a disposal date, and
 * stays in the fleet's history.
 */
@CommandHandler(DeleteEquipmentCommand)
export class DeleteEquipmentHandler implements ICommandHandler<DeleteEquipmentCommand> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
  ) {}

  async execute(command: DeleteEquipmentCommand): Promise<Equipment> {
    const equipment = await this.repository.findById(command.equipmentId);
    if (!equipment) {
      throw new ResourceNotFoundException('Equipment', command.equipmentId);
    }
    return this.repository.save(equipment.deleted());
  }
}
