import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IUpdateWorksite, WorksiteStatus } from '@chantia/shared';

/**
 * Every field optional. `null` clears a field that may be empty; `undefined`
 * (absent) leaves it as it is.
 *
 * `status` is how a site ends: `completed` or `suspended` keeps it listed with
 * its costs. `DELETE` is for a worksite created by mistake.
 */
export class UpdateWorksiteDto implements IUpdateWorksite {
  @ApiPropertyOptional({ example: 'RN7-2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Réfection RN7 - section nord' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'A client of the same organization. `null` detaches the worksite from it.',
  })
  @IsUUID()
  @IsOptional()
  clientId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsNumber()
  @IsOptional()
  latitude?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsNumber()
  @IsOptional()
  longitude?: number | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-09-01' })
  @IsISO8601()
  @IsOptional()
  plannedStartDate?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-12-15' })
  @IsISO8601()
  @IsOptional()
  plannedEndDate?: string | null;

  @ApiPropertyOptional({ enum: WorksiteStatus })
  @IsEnum(WorksiteStatus)
  @IsOptional()
  status?: WorksiteStatus;

  @ApiPropertyOptional({ nullable: true, example: 250000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  totalBudget?: number | null;
}
