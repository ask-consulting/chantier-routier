import { Inject } from '@nestjs/common';
import { equipmentAvailability } from '@chantia/shared';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Equipment } from '../../domain/entities/equipment.entity';
import { EquipmentAssignedOutsideException } from '../../domain/exceptions/equipment-assignment.exceptions';
import { UnknownEquipmentTypeException } from '../../domain/exceptions/equipment.exceptions';
import {
  EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
  EquipmentAssignmentRepositoryPort,
} from '../../domain/ports/equipment-assignment-repository.port';
import {
  EQUIPMENT_CATALOG_PORT,
  EquipmentCatalogPort,
} from '../../domain/ports/equipment-catalog.port';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { UpdateEquipmentCommand } from './update-equipment.command';

/**
 * Changes a machine — description, status, or how it is financed. The rules
 * are checked on the merged result, so changing only the method to "leasing"
 * is refused until the payment and the contract end come with it — and so
 * is retiring it while it is still booked after its disposal date.
 */
@CommandHandler(UpdateEquipmentCommand)
export class UpdateEquipmentHandler implements ICommandHandler<UpdateEquipmentCommand> {
  constructor(
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly repository: EquipmentRepositoryPort,
    @Inject(EQUIPMENT_CATALOG_PORT)
    private readonly catalog: EquipmentCatalogPort,
    @Inject(EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT)
    private readonly assignments: EquipmentAssignmentRepositoryPort,
  ) {}

  async execute(command: UpdateEquipmentCommand): Promise<Equipment> {
    const { equipmentId, data } = command;

    const equipment = await this.repository.findById(equipmentId);
    if (!equipment) {
      throw new ResourceNotFoundException('Equipment', equipmentId);
    }

    // The type's defaults are needed only if its lifetime has to be filled —
    // a new type, or a machine becoming owned — but reading them always keeps
    // one path, and refuses an unknown new type on its field.
    const typeCode = data.typeCode ?? equipment.typeCode;
    const type = await this.catalog.findType(typeCode);
    if (!type) {
      throw new UnknownEquipmentTypeException(typeCode);
    }

    const changed = equipment.with(data, type);

    // A disposal date, an earlier contract end, a later acquisition: none may
    // leave the machine booked on days it is no longer there.
    const { from, until } = equipmentAvailability(changed.costInput);
    const outside = await this.assignments.countOutside(changed.id, from, until);
    if (outside > 0) {
      throw new EquipmentAssignedOutsideException(outside);
    }

    return this.repository.save(changed);
  }
}
