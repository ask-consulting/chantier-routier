import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Equipment } from '../../domain/entities/equipment.entity';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { UpdateEquipmentCommand } from './update-equipment.command';

/**
 * Changes a machine — description, status, or how it is financed. The rules
 * are checked on the merged result, so changing only the method to "leasing"
 * is refused until the payment and the contract end come with it.
 */
@CommandHandler(UpdateEquipmentCommand)
export class UpdateEquipmentHandler implements ICommandHandler<UpdateEquipmentCommand> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
  ) {}

  async execute(command: UpdateEquipmentCommand): Promise<Equipment> {
    const { equipmentId, data } = command;

    const equipment = await this.repository.findById(equipmentId);
    if (!equipment) {
      throw new ResourceNotFoundException('Equipment', equipmentId);
    }

    return this.repository.save(equipment.with(data));
  }
}
