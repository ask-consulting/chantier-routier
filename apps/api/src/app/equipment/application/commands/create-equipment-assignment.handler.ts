import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
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
import { CreateEquipmentAssignmentCommand } from './create-equipment-assignment.command';

@CommandHandler(CreateEquipmentAssignmentCommand)
export class CreateEquipmentAssignmentHandler
  implements ICommandHandler<CreateEquipmentAssignmentCommand>
{
  constructor(
    @Inject(EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT)
    private readonly assignments: EquipmentAssignmentRepositoryPort,
    @Inject(EQUIPMENT_REPOSITORY_PORT)
    private readonly equipment: EquipmentRepositoryPort,
  ) {}

  async execute(command: CreateEquipmentAssignmentCommand): Promise<EquipmentAssignment> {
    const { organizationId, data } = command;

    // Both through the tenant filter: a machine or a worksite of another
    // organization — or deleted — is refused exactly like one that does not
    // exist. A 400 on the field rather than a 404: the resource addressed is
    // the assignment, and what is wrong is one of its fields.
    const machine = await this.equipment.findById(data.equipmentId);
    if (!machine) {
      throw new InvalidAssignmentException('equipmentId', 'unknownEquipment', 'Unknown machine');
    }
    const worksite = await this.assignments.findWorksite(data.worksiteId);
    if (!worksite) {
      throw new InvalidAssignmentException('worksiteId', 'unknownWorksite', 'Unknown worksite');
    }

    const assignment = EquipmentAssignment.create(
      { ...data, id: randomUUID(), organizationId },
      { equipment: machine, worksite },
    );
    await checkPlacement(assignment, machine, this.assignments);

    return this.assignments.save(assignment);
  }
}
