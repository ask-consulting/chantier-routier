import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ICreateWorksite, WorksiteStatus } from '@chantia/shared';

export class CreateWorksiteDto implements ICreateWorksite {
  @ApiProperty({ example: 'RN7-2026' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Réfection RN7 - section nord' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  client?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
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
  @IsNumber()
  @IsOptional()
  totalBudget?: number | null;
}
