import { Inject, Injectable } from '@nestjs/common';
import { InvitationStatus, invitationStatusOf } from '@chantia/shared';
import { Prisma } from '@prisma/client';
import { SearchResult } from '@shared/domain/search.types';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Invitation } from '../../domain/entities/invitation.entity';
import {
  InvitationRepositoryPort,
  InvitationSearchParams,
} from '../../domain/ports/invitation-repository.port';
import { InvitationListItem } from '../../domain/read-models/invitation-list-item';
import { InvitationMapper } from '../mappers/invitation.mapper';

/**
 * `invitations` carries no `organizationId` — it hangs off `app_users` — so the
 * automatic tenant filter does not reach it (see docs/09-multi-tenant.md). Every
 * lookup here therefore goes through a token nobody can guess, an id already
 * resolved within the tenant, or — for the list — an **explicit** clause on the
 * owning user's organization. That clause is not optional and not defaulted:
 * `InvitationSearchParams.organizationId` is required, so a caller cannot forget
 * it and quietly list another tenant's invitations.
 */
@Injectable()
export class InvitationRepository implements InvitationRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async findById(id: string): Promise<Invitation | null> {
    const row = await this.prisma.invitation.findUnique({ where: { id } });
    return row ? InvitationMapper.toDomain(row) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const row = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    return row ? InvitationMapper.toDomain(row) : null;
  }

  async search(params: InvitationSearchParams): Promise<SearchResult<InvitationListItem>> {
    const { skip, take, page } = getPrismaPagination(params);
    const where = buildWhere(params);

    const [rows, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        // Both relations in the join: the invitee, whose name the screen lists,
        // and the admin who sent it. `invitedBy` became a real relation on
        // 2 September — it used to be a bare id resolved by a second query.
        include: { user: true, invitedBy: true },
        // Pending first, then expired, then accepted — the default the screen
        // asks for, done in SQL rather than after the fact, so page 2 is not a
        // different sort from page 1.
        //
        // Accepted rows are the only ones with a date in `acceptedAt`, so nulls
        // first separates "still open or missed" from "done". Within the nulls,
        // the furthest expiry comes first, which puts everything still live
        // above everything already lapsed.
        orderBy: [{ acceptedAt: { sort: 'asc', nulls: 'first' } }, { expiresAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.invitation.count({ where }),
    ]);

    return {
      items: rows.map((row) => toListItem(row)),
      total,
      page,
      limit: take ?? total,
    };
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
    // Expired, not accepted, and the row is kept: it is the audit trail of who
    // invited whom and when. Marking it accepted would make it unusable too —
    // but it would also tell the invitations screen that somebody joined, which
    // is the one thing that screen exists to answer.
    await this.prisma.invitation.updateMany({
      where: { userId, acceptedAt: null, expiresAt: { gt: at } },
      data: { expiresAt: at },
    });
  }

  async deleteExpired(before: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.invitation.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return count;
  }
}

/**
 * The `where` clause, status included.
 *
 * The status is derived rather than stored, so filtering on it means saying the
 * same rule in SQL that `invitationStatusOf` says in TypeScript. The two are
 * kept side by side here on purpose — a third spelling of "still usable" is how
 * a list stops matching the badge it draws.
 */
function buildWhere(params: InvitationSearchParams): Prisma.InvitationWhereInput {
  const now = new Date();
  const search = params.search?.trim();

  const status: Prisma.InvitationWhereInput =
    params.status === InvitationStatus.ACCEPTED
      ? { acceptedAt: { not: null } }
      : params.status === InvitationStatus.PENDING
        ? { acceptedAt: null, expiresAt: { gt: now } }
        : params.status === InvitationStatus.EXPIRED
          ? { acceptedAt: null, expiresAt: { lte: now } }
          : {};

  return {
    // The tenant clause, spelled out — see the class comment.
    user: {
      organizationId: params.organizationId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    ...status,
  };
}

type InvitationWithUser = Prisma.InvitationGetPayload<{
  include: { user: true; invitedBy: true };
}>;

function toListItem(row: InvitationWithUser): InvitationListItem {
  return {
    id: row.id,
    userId: row.userId,
    email: row.user.email,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    status: invitationStatusOf(row),
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
    invitedById: row.invitedById,
    // Null when that account has been deleted: the foreign key sets the column
    // to NULL rather than taking the invitation with it.
    invitedByName: row.invitedBy ? `${row.invitedBy.firstName} ${row.invitedBy.lastName}` : null,
  };
}
