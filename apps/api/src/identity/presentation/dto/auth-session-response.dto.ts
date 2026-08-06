import { ApiProperty } from '@nestjs/swagger';
import { IAuthSession } from '@chantia/shared';
import { IssuedSession } from '../../application/services/session-issuer.service';
import { UserResponseDto } from './user-response.dto';

/** Response of register, login and refresh: the tokens plus who they belong to. */
export class AuthSessionResponseDto implements IAuthSession {
  @ApiProperty({ description: 'Short-lived JWT to send as `Authorization: Bearer <token>`' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque, single-use. Rotated on every refresh — store the new one.' })
  refreshToken: string;

  @ApiProperty({ description: 'Access-token lifetime in seconds', example: 900 })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  static fromIssuedSession(session: IssuedSession): AuthSessionResponseDto {
    const dto = new AuthSessionResponseDto();
    dto.accessToken = session.accessToken;
    dto.refreshToken = session.refreshToken;
    dto.expiresIn = session.expiresIn;
    dto.tokenType = 'Bearer';
    dto.user = UserResponseDto.fromDomain(session.user);
    return dto;
  }
}
