import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { Equipment } from '../../domain/entities/equipment.entity';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { CreateEquipmentCommand } from './create-equipment.command';

@CommandHandler(CreateEquipmentCommand)
export class CreateEquipmentHandler implements ICommandHandler<CreateEquipmentCommand> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
  ) {}

  async execute(command: CreateEquipmentCommand): Promise<Equipment> {
    const { organizationId, data } = command;
    // Every rule — catalog type, money per acquisition method, dates — is the
    // aggregate's; see `Equipment`.
    return this.repository.save(Equipment.create({ ...data, id: randomUUID(), organizationId }));
  }
}
