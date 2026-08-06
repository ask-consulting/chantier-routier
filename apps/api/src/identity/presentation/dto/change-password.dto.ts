import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IChangePassword } from '@chantia/shared';

export class ChangePasswordDto implements IChangePassword {
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  currentPassword: string;

  /** Minimum length comes from `IdentityConfig.minPasswordLength` — see `RegisterDto`. */
  @ApiProperty({ format: 'password', minLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  newPassword: string;
}
