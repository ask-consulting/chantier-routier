import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationStatus } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { InvitationRepository } from './invitation.repository';

/**
 * The query side of the invitations screen, against a Prisma double.
 *
 * Two things here are worth testing without a database, because both are places
 * where a rule is written *twice* and can drift:
 *
 *   1. **The status filter.** It is derived, not stored, so filtering on it
 *      means saying in SQL what `invitationStatusOf` says in TypeScript. A third
 *      spelling of "still open" is how a list stops matching the badge it draws.
 *   2. **The tenant clause.** `invitations` carries no `organization_id`, so
 *      nothing in the database enforces the boundary — only this `where` does.
 *
 * The ordering is asserted for the same reason: "pending first" is the screen's
 * default, and it has to hold across pages, which only SQL can promise.
 */

const NOW_ISH = 1000;

function setup(rows: unknown[] = []) {
  const findMany = vi.fn(async () => rows);
  const count = vi.fn(async () => rows.length);
  const findUnique = vi.fn(async () => rows[0] ?? null);
  const updateMany = vi.fn(async () => ({ count: 1 }));
  const deleteMany = vi.fn(async () => ({ count: 3 }));

  const prisma = {
    invitation: { findMany, count, findUnique, updateMany, deleteMany },
  } as unknown as TenantPrismaClient;

  return {
    findMany,
    count,
    findUnique,
    updateMany,
    deleteMany,
    repository: new InvitationRepository(prisma),
  };
}

/** The shape the assertions read out of the `where` clause Prisma was handed. */
interface WhereClause {
  acceptedAt?: unknown;
  expiresAt?: { gt?: Date; lte?: Date };
  user: { organizationId: string; OR?: unknown[] };
}

function whereOf(mock: { mock: { calls: unknown[][] } }): WhereClause {
  return (mock.mock.calls[0][0] as { where: WhereClause }).where;
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    userId: 'user-1',
    invitedById: 'admin-1',
    expiresAt: new Date(Date.now() + NOW_ISH),
    acceptedAt: null,
    createdAt: new Date(),
    user: { email: 'karim@exemple.fr', firstName: 'Karim', lastName: 'Benali' },
    invitedBy: { firstName: 'Abdellatif', lastName: 'Ellouze' },
    ...overrides,
  };
}

describe('InvitationRepository.search', () => {
  let harness: ReturnType<typeof setup>;

  beforeEach(() => {
    harness = setup([row()]);
  });

  it('scopes to the caller’s organization, always', async () => {
    await harness.repository.search({ organizationId: 'org-1' });

    const where = whereOf(harness.findMany);
    expect(where.user.organizationId).toBe('org-1');
  });

  it('orders pending first, then expired, then accepted — in SQL', async () => {
    await harness.repository.search({ organizationId: 'org-1' });

    const { orderBy } = harness.findMany.mock.calls[0][0] as { orderBy: unknown };
    expect(orderBy).toEqual([
      // Only accepted rows carry a date here, so nulls first separates "still
      // open or missed" from "done"…
      { acceptedAt: { sort: 'asc', nulls: 'first' } },
      // …and within the nulls, the furthest expiry first puts live above lapsed.
      { expiresAt: 'desc' },
    ]);
  });

  it('turns "pending" into the same rule the badge uses', async () => {
    await harness.repository.search({ organizationId: 'org-1', status: InvitationStatus.PENDING });

    const where = whereOf(harness.findMany);
    expect(where.acceptedAt).toBeNull();
    expect(where.expiresAt?.gt).toBeInstanceOf(Date);
  });

  it('turns "expired" into the mirror of it', async () => {
    await harness.repository.search({ organizationId: 'org-1', status: InvitationStatus.EXPIRED });

    const where = whereOf(harness.findMany);
    expect(where.acceptedAt).toBeNull();
    expect(where.expiresAt?.lte).toBeInstanceOf(Date);
  });

  it('turns "accepted" into "has a date"', async () => {
    await harness.repository.search({ organizationId: 'org-1', status: InvitationStatus.ACCEPTED });

    const where = whereOf(harness.findMany);
    expect(where.acceptedAt).toEqual({ not: null });
  });

  it('searches names and email together, case-insensitively', async () => {
    await harness.repository.search({ organizationId: 'org-1', search: '  Benali ' });

    const where = whereOf(harness.findMany);
    expect(where.user.OR).toEqual([
      { firstName: { contains: 'Benali', mode: 'insensitive' } },
      { lastName: { contains: 'Benali', mode: 'insensitive' } },
      { email: { contains: 'Benali', mode: 'insensitive' } },
    ]);
  });

  it('ignores a search made only of spaces', async () => {
    await harness.repository.search({ organizationId: 'org-1', search: '   ' });

    const where = whereOf(harness.findMany);
    expect(where.user.OR).toBeUndefined();
  });

  it('joins who invited, in the same query', async () => {
    const result = await harness.repository.search({ organizationId: 'org-1' });

    const { include } = harness.findMany.mock.calls[0][0] as { include: unknown };
    // One query for the page, both relations. It used to be a second `IN` query
    // resolving a bare id; `invited_by_id` is a real foreign key since 2 Sept.
    expect(include).toEqual({ user: true, invitedBy: true });
    expect(result.items[0].invitedByName).toBe('Abdellatif Ellouze');
    expect(result.items[0].invitedById).toBe('admin-1');
  });

  it('leaves the name null when that account is gone', async () => {
    // `ON DELETE SET NULL`: deleting the manager who invited must not take
    // somebody else's pending invitation with it.
    const orphan = setup([row({ invitedById: null, invitedBy: null })]);

    const result = await orphan.repository.search({ organizationId: 'org-1' });

    expect(result.items[0].invitedByName).toBeNull();
    expect(result.items[0].invitedById).toBeNull();
  });

  it('derives the status of each row it returns', async () => {
    const mixed = setup([
      row(),
      row({ id: 'inv-2', acceptedAt: new Date() }),
      row({ id: 'inv-3', expiresAt: new Date(Date.now() - 60_000) }),
    ]);

    const result = await mixed.repository.search({ organizationId: 'org-1' });

    expect(result.items.map((item) => item.status)).toEqual([
      InvitationStatus.PENDING,
      InvitationStatus.ACCEPTED,
      InvitationStatus.EXPIRED,
    ]);
  });
});

describe('InvitationRepository, the rest of the port', () => {
  it('reads one invitation by id', async () => {
    const harness = setup([row()]);

    const invitation = await harness.repository.findById('inv-1');

    expect(invitation?.id).toBe('inv-1');
    expect(harness.findUnique).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
  });

  it('reads one by token hash — the only lookup an invitee can trigger', async () => {
    const harness = setup([row()]);

    await harness.repository.findByTokenHash('sha256');

    expect(harness.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'sha256' } });
  });

  it('answers null for an unknown id rather than throwing', async () => {
    const harness = setup([]);

    expect(await harness.repository.findById('nope')).toBeNull();
  });

  it('closes outstanding invitations by EXPIRING them, never by accepting them', async () => {
    const harness = setup();
    const at = new Date('2026-09-02T10:00:00Z');

    await harness.repository.revokeOutstandingFor('user-1', at);

    // This is the bug that shipped once: marking them accepted made them
    // unusable — the goal — but told the invitations screen that somebody had
    // joined when nobody had.
    expect(harness.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', acceptedAt: null, expiresAt: { gt: at } },
      data: { expiresAt: at },
    });
  });

  it('leaves already-closed invitations alone', async () => {
    const harness = setup();

    await harness.repository.revokeOutstandingFor('user-1', new Date());

    const { where } = harness.updateMany.mock.calls[0][0] as {
      where: { acceptedAt: null; expiresAt: { gt: Date } };
    };
    // Accepted ones keep their date; already-expired ones keep theirs, so the
    // row still says *when* it lapsed rather than when somebody pressed a button.
    expect(where.acceptedAt).toBeNull();
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it('purges what can no longer be used, and says how many', async () => {
    const harness = setup();
    const before = new Date('2026-09-02T10:00:00Z');

    expect(await harness.repository.deleteExpired(before)).toBe(3);
    expect(harness.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: before } } });
  });
});
