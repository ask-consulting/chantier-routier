import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EquipmentCostInput,
  ICreateEquipmentAssignment,
  IEquipmentAssignment,
  IUpdateEquipmentAssignment,
} from '@chantia/shared';
import { EquipmentAssignment } from '../../domain/entities/equipment-assignment.entity';

/** A day, not an instant — the same rule as the machine's own dates. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEquipmentAssignmentDto implements ICreateEquipmentAssignment {
  @ApiProperty()
  @IsUUID()
  equipmentId: string;

  @ApiProperty()
  @IsUUID()
  worksiteId: string;

  @ApiProperty({ format: 'date', example: '2026-10-01' })
  @Matches(DAY, { message: 'startDate must be a date (YYYY-MM-DD)' })
  @IsISO8601({ strict: true })
  startDate: string;

  @ApiProperty({ format: 'date', example: '2026-10-31', description: 'Included.' })
  @Matches(DAY, { message: 'endDate must be a date (YYYY-MM-DD)' })
  @IsISO8601({ strict: true })
  endDate: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string | null;
}

/** Other dates or another worksite. The machine is not changed — that is another assignment. */
export class UpdateEquipmentAssignmentDto implements IUpdateEquipmentAssignment {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  worksiteId?: string;

  @ApiPropertyOptional({ format: 'date' })
  @Matches(DAY, { message: 'startDate must be a date (YYYY-MM-DD)' })
  @IsISO8601({ strict: true })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ format: 'date' })
  @Matches(DAY, { message: 'endDate must be a date (YYYY-MM-DD)' })
  @IsISO8601({ strict: true })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string | null;
}

export class GetEquipmentAssignmentsDto {
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

  @ApiPropertyOptional({ description: 'One machine’s planning.' })
  @IsUUID()
  @IsOptional()
  equipmentId?: string;

  @ApiPropertyOptional({ description: 'What is on one worksite.' })
  @IsUUID()
  @IsOptional()
  worksiteId?: string;
}

export class EquipmentAssignmentResponseDto implements IEquipmentAssignment {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() equipmentId: string;
  @ApiProperty() worksiteId: string;
  @ApiProperty({ format: 'date' }) startDate: string;
  @ApiProperty({ format: 'date', description: 'Included.' }) endDate: string;
  @ApiProperty({ description: 'Calendar days, both ends included.' }) days: number;
  @ApiProperty({ nullable: true }) notes: string | null;
  @ApiProperty() equipment: IEquipmentAssignment['equipment'];
  @ApiProperty() worksite: IEquipmentAssignment['worksite'];
  @ApiProperty({
    required: false,
    description: 'Stored, at the pricing agreed. Omitted without budget:read.',
  })
  cost?: number;
  @ApiProperty({
    required: false,
    description: 'The machine’s pricing when the assignment was made. Omitted without budget:read.',
  })
  pricing?: EquipmentCostInput;
  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) updatedAt?: string;

  /**
   * @param options.includeMoney when false, `cost` and `pricing` are left
   *   unset and never reach the client — the rule of every money field.
   */
  static fromDomain(
    assignment: EquipmentAssignment,
    options: { includeMoney: boolean },
  ): EquipmentAssignmentResponseDto {
    const dto = new EquipmentAssignmentResponseDto();
    dto.id = assignment.id;
    dto.organizationId = assignment.organizationId;
    dto.equipmentId = assignment.equipmentId;
    dto.worksiteId = assignment.worksiteId;
    dto.startDate = assignment.startDate;
    dto.endDate = assignment.endDate;
    dto.days = assignment.days;
    dto.notes = assignment.notes;
    // Read back after every write, so both are loaded; the fallbacks only
    // guard the type.
    const machine = assignment.equipment;
    dto.equipment = {
      id: assignment.equipmentId,
      designation: machine?.designation ?? '',
      typeCode: machine?.typeCode ?? '',
      fleetNumber: machine?.fleetNumber ?? null,
    };
    dto.worksite = assignment.worksite ?? { id: assignment.worksiteId, code: '', name: '' };
    if (options.includeMoney) {
      dto.cost = assignment.cost;
      dto.pricing = assignment.pricing;
    }
    dto.createdAt = assignment.createdAt?.toISOString();
    dto.updatedAt = assignment.updatedAt?.toISOString();
    return dto;
  }
}

export class PaginatedEquipmentAssignmentResponseDto {
  @ApiProperty({ type: [EquipmentAssignmentResponseDto] })
  items: EquipmentAssignmentResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
