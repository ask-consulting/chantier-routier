import { Injectable } from '@nestjs/common';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token-repository.port';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';
import { IdentityPrismaService } from '../persistence/identity-prisma.service';

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    const data = RefreshTokenMapper.toPersistence(token);
    const row = await this.prisma.refreshToken.upsert({
      where: { id: token.id },
      create: data,
      update: data,
    });
    return RefreshTokenMapper.toDomain(row);
  }

  async revokeAllForUser(userId: string, at: Date = new Date()): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async deleteExpired(before: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return count;
  }
}
