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
   * No `@MinLength` here: the minimum is configurable
   * (`IdentityConfig.minPasswordLength`) and enforced by the handler, so the
   * rule has one definition rather than one per DTO.
   */
  @ApiProperty({ format: 'password', minLength: 10 })
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
