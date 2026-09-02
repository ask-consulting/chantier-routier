import { ApiProperty } from '@nestjs/swagger';
import { IInvitationListItem, InvitationStatus } from '@chantia/shared';
import { InvitationListItem } from '../../domain/read-models/invitation-list-item';

/**
 * One row of the invitations screen.
 *
 * The token is absent, in every form — hash included. The screen shows who was
 * invited and where it stands; nothing it displays could ever be used to accept
 * an invitation.
 */
export class InvitationListItemDto implements IInvitationListItem {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: InvitationStatus }) status: InvitationStatus;
  @ApiProperty() expiresAt: string;
  @ApiProperty({ nullable: true, type: String }) acceptedAt: string | null;
  @ApiProperty() createdAt: string;

  static fromReadModel(item: InvitationListItem): InvitationListItemDto {
    const dto = new InvitationListItemDto();
    dto.id = item.id;
    dto.userId = item.userId;
    dto.email = item.email;
    dto.firstName = item.firstName;
    dto.lastName = item.lastName;
    dto.status = item.status;
    dto.expiresAt = item.expiresAt.toISOString();
    dto.acceptedAt = item.acceptedAt ? item.acceptedAt.toISOString() : null;
    dto.createdAt = item.createdAt.toISOString();
    return dto;
  }
}

export class PaginatedInvitationResponseDto {
  @ApiProperty({ type: [InvitationListItemDto] }) items: InvitationListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

/** What a resend hands back: a fresh link, shown once, and its new deadline. */
export class ResentInvitationDto {
  @ApiProperty({ example: '/invitation/aB3x…', description: 'The new link. Shown once.' })
  invitationPath: string;
  @ApiProperty() expiresAt: string;
}
