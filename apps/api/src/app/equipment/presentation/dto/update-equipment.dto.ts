import { PartialType } from '@nestjs/swagger';
import { IUpdateEquipment } from '@chantia/shared';
import { CreateEquipmentDto } from './create-equipment.dto';

/** Every field optional; `null` clears. The aggregate re-checks the whole. */
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) implements IUpdateEquipment {}
