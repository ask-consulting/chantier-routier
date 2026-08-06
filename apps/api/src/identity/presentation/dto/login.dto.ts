import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ILoginRequest } from '@chantia/shared';

export class LoginDto implements ILoginRequest {
  @ApiProperty({ example: 'admin@ellouze-construction.fr' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;
}
