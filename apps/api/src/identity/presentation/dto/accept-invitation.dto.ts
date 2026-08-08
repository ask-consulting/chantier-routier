import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IAcceptInvitation } from '@chantia/shared';

export class AcceptInvitationDto implements IAcceptInvitation {
  @ApiProperty({ description: 'The opaque token from the invitation link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;

  /** Policy enforced by the handler — see docs/08-identity-module.md §7. */
  @ApiProperty({ format: 'password', minLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;
}
