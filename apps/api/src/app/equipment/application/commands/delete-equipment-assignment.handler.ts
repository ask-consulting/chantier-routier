import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
  EquipmentAssignmentRepositoryPort,
} from '../../domain/ports/equipment-assignment-repository.port';
import { DeleteEquipmentAssignmentCommand } from './delete-equipment-assignment.command';

/**
 * Cancels an assignment — a real delete: nothing hangs off it. Its cost
 * leaves the worksite's with it, which is the point of cancelling.
 */
@CommandHandler(DeleteEquipmentAssignmentCommand)
export class DeleteEquipmentAssignmentHandler
  implements ICommandHandler<DeleteEquipmentAssignmentCommand>
{
  constructor(
    @Inject(EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT)
    private readonly assignments: EquipmentAssignmentRepositoryPort,
  ) {}

  async execute(command: DeleteEquipmentAssignmentCommand): Promise<void> {
    const assignment = await this.assignments.findById(command.assignmentId);
    if (!assignment) {
      throw new ResourceNotFoundException('EquipmentAssignment', command.assignmentId);
    }
    await this.assignments.delete(assignment.id);
  }
}
