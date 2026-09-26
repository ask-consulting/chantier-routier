import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { EquipmentAssignment } from '../../domain/entities/equipment-assignment.entity';
import { InvalidAssignmentException } from '../../domain/exceptions/equipment-assignment.exceptions';
import {
  EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
  EquipmentAssignmentRepositoryPort,
} from '../../domain/ports/equipment-assignment-repository.port';
import {
  EQUIPMENT_REPOSITORY_PORT,
  EquipmentRepositoryPort,
} from '../../domain/ports/equipment-repository.port';
import { checkPlacement } from '../check-placement';
import { UpdateEquipmentAssignmentCommand } from './update-equipment-assignment.command';

/** Other dates, or another worksite — the machine stays, and every rule is checked again. */
@CommandHandler(UpdateEquipmentAssignmentCommand)
export class UpdateEquipmentAssignmentHandler
  implements ICommandHandler<UpdateEquipmentAssignmentCommand>
{
  constructor(
    @Inject(EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT)
    private readonly assignments: EquipmentAssignmentRepositoryPort,
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly equipment: EquipmentRepositoryPort,
  ) {}

  async execute(command: UpdateEquipmentAssignmentCommand): Promise<EquipmentAssignment> {
    const { assignmentId, data } = command;

    const current = await this.assignments.findById(assignmentId);
    if (!current) {
      throw new ResourceNotFoundException('EquipmentAssignment', assignmentId);
    }

    if (data.worksiteId !== undefined && data.worksiteId !== current.worksiteId) {
      const worksite = await this.assignments.findWorksite(data.worksiteId);
      if (!worksite) {
        throw new InvalidAssignmentException('worksiteId', 'unknownWorksite', 'Unknown worksite');
      }
    }

    const machine = await this.equipment.findById(current.equipmentId);
    if (!machine) {
      // The machine was deleted since: nothing to plan any more.
      throw new InvalidAssignmentException('equipmentId', 'unknownEquipment', 'Unknown machine');
    }

    const changed = current.with(data);
    await checkPlacement(changed, machine, this.assignments);

    return this.assignments.save(changed);
  }
}
