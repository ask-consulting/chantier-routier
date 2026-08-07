import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ICreateUser, Locale, UserRole } from '@chantia/shared';

/**
 * No password field, on purpose.
 *
 * The invitee sets their own through the link, so an admin never chooses — nor
 * learns — their team's passwords.
 */
export class InviteUserDto implements ICreateUser {
  @ApiProperty({ example: 'chef.chantier@ellouze-construction.fr' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Karim' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Benali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.WORKER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: Locale, default: Locale.FRENCH, description: 'Interface language' })
  @IsEnum(Locale)
  @IsOptional()
  locale?: Locale;

  @ApiPropertyOptional({ nullable: true, description: 'Links the account to an existing worker record' })
  @IsUUID()
  @IsOptional()
  workerId?: string | null;
}
