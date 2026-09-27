import { Inject } from '@nestjs/common';
import { mayCancelAssignment } from '@chantia/shared';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
  EquipmentAssignmentRepositoryPort,
} from '../../domain/ports/equipment-assignment-repository.port';
import { AssignmentHistoryLockedException } from '../../domain/exceptions/equipment-assignment.exceptions';
import { DeleteEquipmentAssignmentCommand } from './delete-equipment-assignment.command';

/**
 * Cancels an assignment that has not started — a real delete: nothing hangs
 * off it, and its cost leaves the worksite's, which is the point of cancelling.
 *
 * One that started is refused: its past days are in a worksite's cost, and
 * deleting it would lower that cost after the fact. It is ended instead (its
 * end moved to today). Correcting a real mistake is `equipment:correct-history`.
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

    const today = new Date().toISOString().slice(0, 10);
    if (!command.mayCorrectHistory && !mayCancelAssignment(assignment, today)) {
      throw new AssignmentHistoryLockedException('id');
    }

    await this.assignments.delete(assignment.id);
  }
}
