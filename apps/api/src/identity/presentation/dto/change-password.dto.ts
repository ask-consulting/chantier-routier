import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IChangePassword } from '@chantia/shared';

export class ChangePasswordDto implements IChangePassword {
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  currentPassword: string;

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
  newPassword: string;
}
