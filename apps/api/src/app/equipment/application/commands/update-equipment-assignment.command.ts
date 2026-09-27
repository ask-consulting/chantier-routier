import { IUpdateEquipmentAssignment } from '@chantia/shared';

export class UpdateEquipmentAssignmentCommand {
  constructor(
    public readonly assignmentId: string,
    public readonly data: IUpdateEquipmentAssignment,
    /** `equipment:correct-history` — may rewrite days that already happened. */
    public readonly mayCorrectHistory = false,
  ) {}
}
