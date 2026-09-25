import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ClientType } from '@chantia/shared';

/** An allow-list, like `WORKSITE_SORT_FIELDS`: an unknown key is a 400, not a 500. */
export const CLIENT_SORT_FIELDS = ['displayName', 'type', 'billingCity', 'createdAt'] as const;

export class GetClientsDto {
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

  @ApiPropertyOptional({
    description: 'Disable pagination and return all rows — what a client picker needs',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  paginated?: boolean;

  @ApiPropertyOptional({ description: 'Free-text search on the name and the billing city' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ClientType })
  @IsEnum(ClientType)
  @IsOptional()
  type?: ClientType;

  @ApiPropertyOptional({ enum: CLIENT_SORT_FIELDS })
  @IsIn(CLIENT_SORT_FIELDS)
  @IsOptional()
  sortField?: (typeof CLIENT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
