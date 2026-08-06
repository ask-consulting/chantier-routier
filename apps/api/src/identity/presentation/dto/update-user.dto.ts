import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IUpdateUser, UserRole } from '@chantia/shared';

/**
 * Email is absent on purpose: it is the login identifier, and letting it change
 * would silently move an account's identity. Deleting and re-creating is the
 * explicit path.
 */
export class UpdateUserDto implements IUpdateUser {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Deactivating ends the account’s live sessions' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsUUID()
  @IsOptional()
  workerId?: string | null;
}
