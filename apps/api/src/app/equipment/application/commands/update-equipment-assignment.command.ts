import { IUpdateEquipmentAssignment } from '@chantia/shared';

export class UpdateEquipmentAssignmentCommand {
  constructor(
    public readonly assignmentId: string,
    public readonly data: IUpdateEquipmentAssignment,
  ) {}
}
