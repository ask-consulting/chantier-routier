import { Invitation as PrismaInvitation, Prisma, User as PrismaUser } from '@prisma/client';
import { Invitation } from '../../domain/entities/invitation.entity';
import { UserMapper } from './user.mapper';

/**
 * A row, with whichever relations the query happened to include.
 *
 * Optional rather than two mapper methods: the write paths read an invitation on
 * its own, the list reads it with both sides, and one function that maps what is
 * there keeps the two from drifting.
 */
type InvitationRow = PrismaInvitation & {
  user?: PrismaUser | null;
  invitedBy?: PrismaUser | null;
};

export class InvitationMapper {
  static toDomain(row: InvitationRow): Invitation {
    return Invitation.issue({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      invitedById: row.invitedById,
      createdAt: row.createdAt,
      // Absent when the query did not ask for them; the entity's own comment
      // explains how a caller tells that apart from "the account is gone".
      invitee: row.user ? UserMapper.toDomain(row.user) : null,
      invitedBy: row.invitedBy ? UserMapper.toDomain(row.invitedBy) : null,
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
