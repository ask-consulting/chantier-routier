import { ApiProperty } from '@nestjs/swagger';
import { IInvitation, IInvitationPreview } from '@chantia/shared';
import { IssuedInvitation } from '../../application/commands/invite-user.handler';
import { UserResponseDto } from './user-response.dto';

/**
 * What an admin gets back after inviting somebody.
 *
 * The path is returned rather than sent: delivery belongs to a notification
 * module that does not exist yet. Until it does, the admin copies the link and
 * passes it on by whatever channel suits — which is also why the API must not
 * assume email.
 *
 * Shown once. Only the token's hash is stored, so it cannot be read again.
 */
export class InvitationResponseDto implements IInvitation {
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ example: '/invitation/aB3x…', description: 'Hand this over. Shown once.' })
  invitationPath: string;
  @ApiProperty() expiresAt: string;

  static fromIssued(issued: IssuedInvitation): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    dto.user = UserResponseDto.fromDomain(issued.user);
    dto.invitationPath = issued.invitationPath;
    dto.expiresAt = issued.expiresAt.toISOString();
    return dto;
  }
}

/** The little that an invitation page may show before a password is chosen. */
export class InvitationPreviewDto implements IInvitationPreview {
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty() organizationName: string;
}
