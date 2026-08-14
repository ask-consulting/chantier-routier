import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { WorksiteStatus } from '@chantia/shared';

/**
 * The columns a caller may sort by.
 *
 * An allow-list rather than a free string, for two reasons. An unknown name used
 * to reach Prisma untouched and come back as a 500 instead of a 400. And more
 * importantly `totalBudget` is a real column: sorting on it hands the *ranking*
 * of every budget to somebody who is not allowed to read a single figure — which
 * for a company with a dozen worksites is most of the secret.
 */
export const WORKSITE_SORT_FIELDS = [
  'code',
  'name',
  'client',
  'status',
  'plannedStartDate',
  'plannedEndDate',
  'totalBudget',
  'createdAt',
  'updatedAt',
] as const;

/** Sort keys that reveal money, and so require `budget:read`. */
export const BUDGET_SORT_FIELDS: readonly string[] = ['totalBudget'];

export class GetWorksitesDto {
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

  @ApiPropertyOptional({ description: 'Free-text search on name, code, client' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: WorksiteStatus })
  @IsEnum(WorksiteStatus)
  @IsOptional()
  status?: WorksiteStatus;

  @ApiPropertyOptional({ enum: WORKSITE_SORT_FIELDS })
  @IsIn(WORKSITE_SORT_FIELDS)
  @IsOptional()
  sortField?: (typeof WORKSITE_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
