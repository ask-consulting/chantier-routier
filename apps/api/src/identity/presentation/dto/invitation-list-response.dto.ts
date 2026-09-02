import { ApiProperty } from '@nestjs/swagger';
import { IInvitationListItem, InvitationStatus, invitationStatusOf } from '@chantia/shared';
import { Invitation } from '../../domain/entities/invitation.entity';

/**
 * One row of the invitations screen.
 *
 * The token is absent, in every form — hash included. The screen shows who was
 * invited and where it stands; nothing it displays could ever be used to accept
 * an invitation. That is what this class is *for*: the entity carries the hash,
 * and the only way it reaches a response is if somebody spreads the object
 * instead of naming its fields. Here they are named.
 *
 * `fromDomain` expects an invitation read with its relations — the list query
 * asks for both. An invitation loaded on its own would render empty names, which
 * is why the write paths never build this DTO.
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
  @ApiProperty({ nullable: true, type: String }) invitedById: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Null if that account is gone' })
  invitedByName: string | null;

  static fromDomain(invitation: Invitation): InvitationListItemDto {
    const dto = new InvitationListItemDto();
    dto.id = invitation.id;
    dto.userId = invitation.userId;
    dto.email = invitation.invitee?.email ?? '';
    dto.firstName = invitation.invitee?.firstName ?? '';
    dto.lastName = invitation.invitee?.lastName ?? '';
    // Derived here rather than stored, from the same function the web uses to
    // draw the badge — see `invitationStatusOf`.
    dto.status = invitationStatusOf(invitation);
    dto.expiresAt = invitation.expiresAt.toISOString();
    dto.acceptedAt = invitation.acceptedAt ? invitation.acceptedAt.toISOString() : null;
    dto.createdAt = (invitation.createdAt ?? invitation.expiresAt).toISOString();
    dto.invitedById = invitation.invitedById;
    dto.invitedByName = invitation.invitedBy
      ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
      : null;
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
