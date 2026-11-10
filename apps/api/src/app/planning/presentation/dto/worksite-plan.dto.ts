import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  IInitializeWorksitePlan,
  IUpdateTaskProgress,
  IUpdateWorksiteMembers,
  IUpdateWorksiteTask,
  PLAN_LABEL_LOCALES,
} from '@chantia/shared';

/** A day, not an instant — the same rule as the worksite's own dates. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class InitializeWorksitePlanDto implements IInitializeWorksitePlan {
  @ApiPropertyOptional({ format: 'uuid', description: 'A reference plan to start from' })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Or one of the organization’s plans' })
  @IsUUID()
  @IsOptional()
  organizationPlanId?: string;

  @ApiPropertyOptional({ enum: PLAN_LABEL_LOCALES })
  @IsIn(PLAN_LABEL_LOCALES)
  @IsOptional()
  locale?: string;
}

export class UpdateWorksiteTaskDto implements IUpdateWorksiteTask {
  @ApiProperty({ example: '2026-03-02' })
  @Matches(DAY, { message: 'plannedStart must be a date (YYYY-MM-DD)' })
  plannedStart: string;

  @ApiProperty({ example: '2026-03-06' })
  @Matches(DAY, { message: 'plannedEnd must be a date (YYYY-MM-DD)' })
  plannedEnd: string;
}

export class UpdateTaskProgressDto implements IUpdateTaskProgress {
  @ApiProperty({ minimum: 0, maximum: 100, example: 60 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;
}

export class UpdateWorksiteMembersDto implements IUpdateWorksiteMembers {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  userIds: string[];
}
