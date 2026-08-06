import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ICreateUser, UserRole } from '@chantia/shared';

export class CreateUserDto implements ICreateUser {
  @ApiProperty({ example: 'chef.chantier@ellouze-construction.fr' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** Minimum length comes from `IdentityConfig.minPasswordLength` — see `RegisterDto`. */
  @ApiProperty({ format: 'password', minLength: 10 })
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
