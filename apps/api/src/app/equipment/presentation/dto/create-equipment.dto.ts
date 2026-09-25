import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AcquisitionMethod,
  EQUIPMENT_TYPE_CODES,
  EquipmentStatus,
  ICreateEquipment,
} from '@chantia/shared';

/** A day, not an instant: `2026-09-01`, never `2026-09-01T01:00+02:00`. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MESSAGE = 'must be a date (YYYY-MM-DD)';

/**
 * Shape and ranges only. Which money fields an acquisition method requires,
 * and how the dates relate, are the aggregate's rules (`Equipment`) — they
 * must also hold for a PATCH that changes the method alone, which a DTO
 * cannot see the stored fields of.
 */
export class CreateEquipmentDto implements ICreateEquipment {
  @ApiProperty({ example: 'crawler_excavator', description: 'A code of `EQUIPMENT_TYPES`.' })
  @IsIn(EQUIPMENT_TYPE_CODES)
  typeCode: string;

  @ApiProperty({ example: 'Pelle CAT 320 n°2' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  designation: string;

  @ApiPropertyOptional({ nullable: true, example: 'PL-02' })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  fleetNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Caterpillar' })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  brand?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '320 GC' })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  model?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  serialNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '215 TU 4521' })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  registrationNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 2022 })
  @IsInt()
  @Min(1950)
  @Max(2100)
  @IsOptional()
  manufactureYear?: number | null;

  @ApiPropertyOptional({ enum: EquipmentStatus, default: EquipmentStatus.IN_SERVICE })
  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @ApiProperty({ enum: AcquisitionMethod })
  @IsEnum(AcquisitionMethod)
  acquisitionMethod: AcquisitionMethod;

  @ApiProperty({ example: '2026-01-15', format: 'date' })
  @Matches(DAY, { message: `acquisitionDate ${DAY_MESSAGE}` })
  @IsISO8601({ strict: true })
  acquisitionDate: string;

  @ApiPropertyOptional({ nullable: true, description: 'Seller, lessor or rental company.' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  supplier?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Owned: price excluding tax.' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  purchasePrice?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Owned: value at the end. 0 by default.' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  residualValue?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Owned: depreciation period. Defaults to the type’s.',
    example: 60,
  })
  @IsInt()
  @Min(1)
  @Max(600)
  @IsOptional()
  usefulLifeMonths?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Leasing and long-term rental.' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  monthlyPayment?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Leasing: the price of keeping it.' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  buyoutValue?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Short-term rental.' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  dailyRate?: number | null;

  @ApiPropertyOptional({ nullable: true, format: 'date', description: 'Leasing and rentals.' })
  @Matches(DAY, { message: `contractEndDate ${DAY_MESSAGE}` })
  @IsISO8601({ strict: true })
  @IsOptional()
  contractEndDate?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date', description: 'Required once retired.' })
  @Matches(DAY, { message: `disposalDate ${DAY_MESSAGE}` })
  @IsISO8601({ strict: true })
  @IsOptional()
  disposalDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;
}
