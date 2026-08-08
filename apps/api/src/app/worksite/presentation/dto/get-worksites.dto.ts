import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { WorksiteStatus } from '@chantia/shared';

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortField?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
