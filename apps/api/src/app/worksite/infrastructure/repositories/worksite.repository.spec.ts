import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { WorksiteStatus } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Worksite } from '../../domain/entities/worksite.entity';
import { WorksiteCodeTakenException } from '../../domain/exceptions/worksite.exceptions';
import { WorksiteRepository } from './worksite.repository';

/**
 * The query side, against a Prisma double.
 *
 * `deletedAt: null` on every read is what the whole soft delete rests on: there
 * is no `delete` on this repository, so a removed worksite only ever stops
 * existing by never being read back. And a lost race on the code index must
 * come out as a conflict the client can show, not a 500.
 */

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'worksite-1',
    organizationId: 'org-1',
    code: 'RN7-2026',
    name: 'Réfection RN7',
    clientId: null,
    client: null,
    address: null,
    latitude: null,
    longitude: null,
    plannedStartDate: null,
    plannedEndDate: null,
    status: 'in_progress',
    totalBudget: new Prisma.Decimal('250000.00'),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup(rows: unknown[] = [], upsertError?: unknown) {
  const findMany = vi.fn(async () => rows);
  const count = vi.fn(async () => rows.length);
  const findUnique = vi.fn(async () => rows[0] ?? null);
  const upsert = vi.fn(async () => {
    if (upsertError) throw upsertError;
    return rows[0] ?? row();
  });

  const clientCount = vi.fn(async () => 1);
  const prisma = {
    worksite: { findMany, count, findUnique, upsert },
    client: { count: clientCount },
  } as unknown as TenantPrismaClient;

  return {
    findMany,
    count,
    findUnique,
    upsert,
    clientCount,
    repository: new WorksiteRepository(prisma),
  };
}

function aWorksite(overrides: Partial<Parameters<typeof Worksite.create>[0]> = {}): Worksite {
  return Worksite.create({
    id: 'worksite-1',
    organizationId: 'org-1',
    code: 'RN7-2026',
    name: 'Réfection RN7',
    status: WorksiteStatus.IN_PROGRESS,
    ...overrides,
  });
}

describe('WorksiteRepository — reads', () => {
  it('excludes soft-deleted rows from the list and from its count', async () => {
    const { repository, findMany, count } = setup([row()]);

    await repository.search({ filters: { status: WorksiteStatus.IN_PROGRESS } });

    const listed = (findMany.mock.calls[0][0] as { where: Record<string, unknown> }).where;
    expect(listed.deletedAt).toBeNull();
    expect(listed.status).toBe(WorksiteStatus.IN_PROGRESS);
    // Or the pagination announces rows nobody can see.
    expect((count.mock.calls[0][0] as { where: { deletedAt: null } }).where.deletedAt).toBeNull();
  });

  it('writes no tenant clause — the extension owns that', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({});

    const { where } = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.organizationId).toBeUndefined();
  });

  it('reads one by id, excluding a soft-deleted row', async () => {
    const { repository, findUnique } = setup([row()]);

    const worksite = await repository.findById('worksite-1');

    expect(worksite?.totalBudget).toBe(250_000);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'worksite-1', deletedAt: null } }),
    );
  });
});

describe('WorksiteRepository — the client', () => {
  it('searches the client’s name alongside the worksite’s own fields', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({ filters: { search: 'sousse' } });

    const { where } = findMany.mock.calls[0][0] as { where: { OR: unknown[] } };
    expect(where.OR).toContainEqual({
      client: { displayName: { contains: 'sousse', mode: 'insensitive' } },
    });
    expect(JSON.stringify(where.OR)).toContain('"code"');
  });

  it('sorts by client through the relation', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({ sort: { field: 'client', order: 'desc' } });

    expect((findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual({
      client: { displayName: 'desc' },
    });
  });

  it('reads the client’s name with the worksite', async () => {
    const { repository } = setup([
      row({ clientId: 'client-1', client: { id: 'client-1', displayName: 'STEG' } }),
    ]);

    const worksite = await repository.findById('worksite-1');

    expect(worksite?.client).toEqual({ id: 'client-1', displayName: 'STEG' });
  });

  it('asks the tenant-filtered clients table, excluding deleted ones', async () => {
    const { repository, clientCount } = setup();

    expect(await repository.isAssignableClient('client-1')).toBe(true);
    expect(clientCount).toHaveBeenCalledWith({ where: { id: 'client-1', deletedAt: null } });
  });
});

describe('WorksiteRepository — writes', () => {
  it('persists deletedAt like any other change', async () => {
    const deletedAt = new Date('2026-09-25T00:00:00Z');
    const { repository, upsert } = setup([row({ deletedAt })]);

    await repository.save(aWorksite({ deletedAt }));

    const { update } = upsert.mock.calls[0][0] as { update: { deletedAt: Date | null } };
    expect(update.deletedAt).toEqual(deletedAt);
  });

  it('turns a unique violation into a code conflict', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['organization_id', 'code'] },
    });
    const { repository } = setup([], duplicate);

    await expect(repository.save(aWorksite())).rejects.toBeInstanceOf(WorksiteCodeTakenException);
  });

  it('lets any other database error through untouched', async () => {
    const other = new Error('connection reset');
    const { repository } = setup([], other);

    await expect(repository.save(aWorksite())).rejects.toBe(other);
  });
});
