import { Prisma, RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(row: PrismaRefreshToken): RefreshToken {
    return RefreshToken.issue({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      replacedBy: row.replacedBy,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(token: RefreshToken): Prisma.RefreshTokenUncheckedCreateInput {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      replacedBy: token.replacedBy,
      userAgent: token.userAgent,
    };
  }
}
