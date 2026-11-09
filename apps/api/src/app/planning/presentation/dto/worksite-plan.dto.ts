import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { IInitializeWorksitePlan, IUpdateWorksiteTask, PLAN_LABEL_LOCALES } from '@chantia/shared';

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
