import { ApiProperty } from '@nestjs/swagger';
import { EquipmentResponseDto } from './equipment-response.dto';

export class PaginatedEquipmentResponseDto {
  @ApiProperty({ type: [EquipmentResponseDto] })
  items: EquipmentResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
