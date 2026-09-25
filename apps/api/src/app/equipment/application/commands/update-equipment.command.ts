import { IUpdateEquipment } from '@chantia/shared';

export class UpdateEquipmentCommand {
  constructor(
    public readonly equipmentId: string,
    public readonly data: IUpdateEquipment,
  ) {}
}
