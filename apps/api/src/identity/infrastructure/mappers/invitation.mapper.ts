import { Invitation as PrismaInvitation, Prisma } from '@prisma/client';
import { Invitation } from '../../domain/entities/invitation.entity';

export class InvitationMapper {
  static toDomain(row: PrismaInvitation): Invitation {
    return Invitation.issue({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      invitedById: row.invitedById,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(invitation: Invitation): Prisma.InvitationUncheckedCreateInput {
    return {
      id: invitation.id,
      userId: invitation.userId,
      tokenHash: invitation.tokenHash,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      invitedById: invitation.invitedById,
    };
  }
}
