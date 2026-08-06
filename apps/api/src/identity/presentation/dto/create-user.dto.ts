import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ICreateUser, UserRole } from '@chantia/shared';

export class CreateUserDto implements ICreateUser {
  @ApiProperty({ example: 'chef.chantier@ellouze-construction.fr' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** Policy enforced by the handler — see `RegisterDto` and docs/08-identity-module.md §7. */
  @ApiProperty({
    format: 'password',
    minLength: 10,
    description:
      'At least 10 characters with an uppercase letter, a lowercase letter, a digit and a ' +
      'special character. Rejected if it is a common password or contains your own name, ' +
      'email or organisation name.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;

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

  @ApiPropertyOptional({
    nullable: true,
    description: 'Links the account to an existing worker (HR) record',
  })
  @IsUUID()
  @IsOptional()
  workerId?: string | null;
}
