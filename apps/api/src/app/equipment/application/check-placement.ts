import { equipmentAvailability } from '@chantia/shared';
import { Equipment } from '../domain/entities/equipment.entity';
import { EquipmentAssignment } from '../domain/entities/equipment-assignment.entity';
import {
  EquipmentAlreadyAssignedException,
  InvalidAssignmentException,
} from '../domain/exceptions/equipment-assignment.exceptions';
import { EquipmentAssignmentRepositoryPort } from '../domain/ports/equipment-assignment-repository.port';

/**
 * Whether the machine can be on that worksite over those days — the rules an
 * assignment cannot check on its own, because they depend on the rest of the
 * fleet. Shared by creation and every change, so a move cannot skip what a
 * creation must pass.
 *
 *   1. **The machine is there**: not before it was acquired, not after it was
 *      disposed of or its lease or hire ended.
 *   2. **Nowhere else**: no other assignment of the same machine shares a day.
 *
 * Checked by reading, then writing — two concurrent assignments of the same
 * machine could both pass. Acceptable for a planning written by a handful of
 * people in one office; the day it is not, an exclusion constraint on
 * `(equipment_id, daterange)` makes the database the arbiter.
 */
export async function checkPlacement(
  assignment: EquipmentAssignment,
  equipment: Equipment,
  repository: EquipmentAssignmentRepositoryPort,
): Promise<void> {
  const { from, until } = equipmentAvailability(equipment.costInput);
  if (assignment.startDate < from) {
    throw new InvalidAssignmentException(
      'startDate',
      'beforeEquipmentAvailable',
      `The machine is only available from ${from}`,
    );
  }
  if (until !== null && assignment.endDate > until) {
    throw new InvalidAssignmentException(
      'endDate',
      'afterEquipmentAvailable',
      `The machine is only available until ${until}`,
    );
  }

  const [conflict] = await repository.findOverlapping(
    assignment.equipmentId,
    assignment,
    assignment.id,
  );
  if (conflict) {
    throw new EquipmentAlreadyAssignedException({
      worksite: conflict.worksite ? `${conflict.worksite.code} ${conflict.worksite.name}` : 'another worksite',
      startDate: conflict.startDate,
      endDate: conflict.endDate,
    });
  }
}
