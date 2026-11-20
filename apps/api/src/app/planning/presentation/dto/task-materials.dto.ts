import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsUUID, Max, Min, ValidateIf } from 'class-validator';
import {
  IPlanTaskMaterial,
  IUpdateTaskMaterial,
  MAX_QUANTITY,
  QUANTITY_DECIMALS,
} from '@chantia/shared';
import { IsMoney } from '@shared/validation/is-money.decorator';

const QUANTITY = { maxDecimalPlaces: QUANTITY_DECIMALS, allowNaN: false, allowInfinity: false };

export class PlanTaskMaterialDto implements IPlanTaskMaterial {
  @ApiProperty({ format: 'uuid', description: 'A catalog material, or one of the organization’s own' })
  @IsUUID()
  materialId: string;

  @ApiProperty({ description: 'In the material’s unit, up to three decimals', example: 12.5 })
  @IsNumber(QUANTITY)
  @IsPositive()
  @Max(MAX_QUANTITY)
  quantity: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Expected, per unit, in the currency’s smallest unit',
  })
  @ValidateIf((_, value) => value !== null)
  @IsMoney()
  @Min(0)
  @IsOptional()
  unitPrice?: number | null;
}

export class UpdateTaskMaterialDto implements IUpdateTaskMaterial {
  @ApiPropertyOptional({ description: 'In the material’s unit, up to three decimals' })
  @IsNumber(QUANTITY)
  @IsPositive()
  @Max(MAX_QUANTITY)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ nullable: true, description: '`null` takes the price away' })
  @ValidateIf((_, value) => value !== null)
  @IsMoney()
  @Min(0)
  @IsOptional()
  unitPrice?: number | null;
}
