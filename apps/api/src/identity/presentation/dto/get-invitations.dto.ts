import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InvitationStatus } from '@chantia/shared';

/**
 * What the invitations screen may ask for.
 *
 * No `organizationId`: it comes from the caller's token, and a request that
 * could name a tenant would be a request that could name somebody else's.
 */
export class GetInvitationsDto {
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

  @ApiPropertyOptional({ description: 'Free-text search on first name, last name, email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: InvitationStatus,
    description: 'Derived from the dates, not stored — see `invitationStatusOf`.',
  })
  @IsEnum(InvitationStatus)
  @IsOptional()
  status?: InvitationStatus;
}
