import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ICreateOrganizationPlan,
  IPlanNodeInput,
  IUpdateOrganizationPlan,
  PLAN_LABEL_LOCALES,
  WorksiteKind,
} from '@chantia/shared';

const MAX_LABEL = 200;
const MAX_NAME = 120;
const MAX_CHILDREN = 200;

/**
 * One class per level, and not one recursive class: the depth of what the
 * server accepts is then fixed by these types, before any of it is walked.
 */
export class PlanSubtaskDto implements IPlanNodeInput {
  @ApiProperty({ example: 'Contrôle du ferraillage avant coulage' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_LABEL)
  label!: string;

  @ApiPropertyOptional({
    description: 'A check to pass before the work continues',
  })
  @IsBoolean()
  @IsOptional()
  isControl?: boolean;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    nullable: true,
    description: 'When it starts, in percent of its parent',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  startPercent?: number | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 100,
    nullable: true,
    description: 'How long it lasts, in percent of its parent',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  durationPercent?: number | null;
}

export class PlanTaskDto extends PlanSubtaskDto {
  @ApiPropertyOptional({ type: [PlanSubtaskDto] })
  @IsArray()
  @ArrayMaxSize(MAX_CHILDREN)
  @ValidateNested({ each: true })
  @Type(() => PlanSubtaskDto)
  @IsOptional()
  children?: PlanSubtaskDto[];
}

export class PlanPhaseDto extends PlanSubtaskDto {
  @ApiPropertyOptional({ type: [PlanTaskDto] })
  @IsArray()
  @ArrayMaxSize(MAX_CHILDREN)
  @ValidateNested({ each: true })
  @Type(() => PlanTaskDto)
  @IsOptional()
  children?: PlanTaskDto[];
}

export class CreateOrganizationPlanDto implements ICreateOrganizationPlan {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Reference plan to copy',
  })
  @IsUUID()
  @IsOptional()
  sourceTemplateId?: string;

  @ApiPropertyOptional({
    description: 'Required when no reference plan is copied',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: WorksiteKind })
  @IsEnum(WorksiteKind)
  @IsOptional()
  kind?: WorksiteKind;

  @ApiPropertyOptional({
    enum: PLAN_LABEL_LOCALES,
    description: 'Language of the copied labels',
  })
  @IsIn(PLAN_LABEL_LOCALES)
  @IsOptional()
  locale?: string;
}

export class UpdateOrganizationPlanDto implements IUpdateOrganizationPlan {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: WorksiteKind })
  @IsEnum(WorksiteKind)
  @IsOptional()
  kind?: WorksiteKind;

  @ApiPropertyOptional({
    type: [PlanPhaseDto],
    description: 'The whole tree: what is sent replaces what was there',
  })
  @IsArray()
  @ArrayMaxSize(MAX_CHILDREN)
  @ValidateNested({ each: true })
  @Type(() => PlanPhaseDto)
  @IsOptional()
  nodes?: PlanPhaseDto[];
}
