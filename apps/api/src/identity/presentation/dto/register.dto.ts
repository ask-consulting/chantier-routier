import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IRegisterRequest } from '@chantia/shared';

export class RegisterDto implements IRegisterRequest {
  @ApiProperty({ example: 'ELLOUZE construction' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  organizationName: string;

  @ApiProperty({ example: 'admin@ellouze-construction.fr' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  /**
   * No validation decorators for the policy itself: it is configurable
   * (`IdentityConfig.minPasswordLength`) and lives in `@chantia/shared`, enforced
   * by the handler — one definition rather than one per DTO.
   */
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

  @ApiProperty({ example: 'Abdellatif' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Ellouze' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;
}
