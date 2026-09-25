import { ICreateEquipment } from '@chantia/shared';

export class CreateEquipmentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly data: ICreateEquipment,
  ) {}
}
