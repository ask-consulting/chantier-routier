import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { Equipment } from '../../domain/entities/equipment.entity';
import { UnknownEquipmentTypeException } from '../../domain/exceptions/equipment.exceptions';
import {
  EQUIPMENT_CATALOG_PORT,
  EquipmentCatalogPort,
} from '../../domain/ports/equipment-catalog.port';
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
    @Inject(EQUIPMENT_CATALOG_PORT)
    private readonly catalog: EquipmentCatalogPort,
  ) {}

  async execute(command: CreateEquipmentCommand): Promise<Equipment> {
    const { organizationId, data } = command;

    // Before the foreign key, for a 400 on the field rather than a 500.
    const type = await this.catalog.findType(data.typeCode);
    if (!type) {
      throw new UnknownEquipmentTypeException(data.typeCode);
    }

    // Every other rule — money per acquisition method, dates — is the
    // aggregate's; see `Equipment`.
    return this.repository.save(
      Equipment.create({ ...data, id: randomUUID(), organizationId }, type),
    );
  }
}
