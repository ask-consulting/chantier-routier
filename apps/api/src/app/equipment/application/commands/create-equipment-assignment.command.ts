import { ICreateEquipmentAssignment } from '@chantia/shared';

export class CreateEquipmentAssignmentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateEquipmentAssignment,
  ) {}
}
