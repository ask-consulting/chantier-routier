import { Inject, Injectable } from '@nestjs/common';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Invitation } from '../../domain/entities/invitation.entity';
import { InvitationRepositoryPort } from '../../domain/ports/invitation-repository.port';
import { InvitationMapper } from '../mappers/invitation.mapper';

/**
 * `invitations` carries no `organizationId` — it hangs off `app_users` — so the
 * automatic tenant filter does not reach it (see docs/09-multi-tenant.md). That
 * is safe here because every lookup goes through a token nobody can guess, or
 * through a user id already resolved within the tenant.
 */
@Injectable()
export class InvitationRepository implements InvitationRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const row = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    return row ? InvitationMapper.toDomain(row) : null;
  }

  async save(invitation: Invitation): Promise<Invitation> {
    const data = InvitationMapper.toPersistence(invitation);
    const row = await this.prisma.invitation.upsert({
      where: { id: invitation.id },
      create: data,
      update: data,
    });
    return InvitationMapper.toDomain(row);
  }

  async revokeOutstandingFor(userId: string, at: Date = new Date()): Promise<void> {
    // Marked accepted rather than deleted: the row is the audit trail of who
    // invited whom and when, and losing it to a re-invitation would be a shame.
    await this.prisma.invitation.updateMany({
      where: { userId, acceptedAt: null },
      data: { acceptedAt: at },
    });
  }

  async deleteExpired(before: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.invitation.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return count;
  }
}
