import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AcquisitionMethod, EquipmentCategory, EquipmentStatus } from '@chantia/shared';

/**
 * Sortable columns. No money among them: sorting by price would hand the
 * ranking to a caller who may not read a single price — the reason
 * `BUDGET_SORT_FIELDS` exists for worksites.
 */
export const EQUIPMENT_SORT_FIELDS = [
  'designation',
  'fleetNumber',
  'typeCode',
  'status',
  'acquisitionDate',
  'createdAt',
] as const;

export class GetEquipmentListDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Disable pagination and return all rows' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  paginated?: boolean;

  @ApiPropertyOptional({
    description: 'Free text on designation, fleet number, brand, model, serial and plate',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: EquipmentCategory })
  @IsEnum(EquipmentCategory)
  @IsOptional()
  category?: EquipmentCategory;

  @ApiPropertyOptional({ enum: EquipmentStatus })
  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @ApiPropertyOptional({ enum: AcquisitionMethod })
  @IsEnum(AcquisitionMethod)
  @IsOptional()
  acquisitionMethod?: AcquisitionMethod;

  @ApiPropertyOptional({ enum: EQUIPMENT_SORT_FIELDS })
  @IsIn(EQUIPMENT_SORT_FIELDS)
  @IsOptional()
  sortField?: (typeof EQUIPMENT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
