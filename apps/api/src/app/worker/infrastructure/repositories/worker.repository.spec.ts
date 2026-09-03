import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Worker } from '../../domain/entities/worker.entity';
import { WorkerRepository } from './worker.repository';

/**
 * The query side, against a Prisma double.
 *
 * Four things worth pinning without a database:
 *
 *   1. **No tenant clause is written here.** The extension adds it, and a
 *      hand-written `organizationId` in the `where` would be the beginning of
 *      two mechanisms for one rule (docs/09).
 *   2. **The default order is alphabetical.** A payroll is read by name; "who
 *      did we add last" is not a question anybody asks of it.
 *   3. **`deletedAt: null` is on every read.** There is no `delete` method on
 *      this repository at all — a soft-deleted worker only ever stops
 *      existing by never being read back. Forget the filter here and the
 *      whole scheme in `schema.prisma` and `docs/10` is decorative.
 *   4. **The Decimal rate survives a round trip.** Prisma hands one back on
 *      read and expects one on write; the mapper does both conversions.
 */

function setup(rows: unknown[] = []) {
  const findMany = vi.fn(async () => rows);
  const count = vi.fn(async () => rows.length);
  const findUnique = vi.fn(async () => rows[0] ?? null);
  // Ignores what it was handed and just echoes a Decimal-shaped row: the
  // mapper's round trip is exercised on the *read* side by other tests, and
  // mixing a plain-number `create` payload into this mock would fail the
  // mapper's `.toNumber()` call for reasons that have nothing to do with what
  // each test is checking.
  const upsert = vi.fn(async () => rows[0] ?? row());

  const prisma = {
    worker: { findMany, count, findUnique, upsert },
  } as unknown as TenantPrismaClient;

  return { findMany, count, findUnique, upsert, repository: new WorkerRepository(prisma) };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'worker-1',
    organizationId: 'org-1',
    name: 'Karim Benali',
    qualification: 'Maçon',
    // Prisma hands back a Decimal, not a number — the mapper converts it, and
    // this is the one place that would notice if it stopped.
    hourlyRate: new Prisma.Decimal('18.50'),
    active: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('WorkerRepository.search', () => {
  it('writes no tenant clause — the extension owns that', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({});

    const { where } = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.organizationId).toBeUndefined();
  });

  it('excludes soft-deleted rows from the listing', async () => {
    const { repository, findMany, count } = setup([row()]);

    await repository.search({});

    expect((findMany.mock.calls[0][0] as { where: { deletedAt: null } }).where.deletedAt).toBeNull();
    // The count must agree with the list, or the pagination lies about a
    // total that includes rows nobody can actually see.
    expect((count.mock.calls[0][0] as { where: { deletedAt: null } }).where.deletedAt).toBeNull();
  });

  it('keeps a caller-supplied filter alongside the deletedAt clause', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({ filters: { active: true } });

    const { where } = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where.active).toBe(true);
    expect(where.deletedAt).toBeNull();
  });

  it('sorts by name by default', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({});

    expect((findMany.mock.calls[0][0] as { orderBy: unknown }).orderBy).toEqual({ name: 'asc' });
  });

  it('searches name and qualification', async () => {
    const { repository, findMany } = setup([row()]);

    await repository.search({ filters: { search: 'maçon' } });

    const { where } = findMany.mock.calls[0][0] as { where: { OR?: unknown[] } };
    expect(JSON.stringify(where.OR)).toContain('qualification');
    expect(JSON.stringify(where.OR)).toContain('name');
  });

  it('turns the Decimal rate into a number the domain can compute with', async () => {
    const { repository } = setup([row()]);

    const result = await repository.search({});

    expect(result.items[0].hourlyRate).toBe(18.5);
    expect(result.items[0]).toBeInstanceOf(Worker);
  });
});

describe('WorkerRepository, the rest of the port', () => {
  it('reads one by id, excluding a soft-deleted row', async () => {
    const { repository, findUnique } = setup([row()]);

    const worker = await repository.findById('worker-1');

    expect(worker?.name).toBe('Karim Benali');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'worker-1', deletedAt: null } });
  });

  it('answers null for an unknown id', async () => {
    const { repository } = setup([]);

    expect(await repository.findById('nope')).toBeNull();
  });

  it('persists deletedAt exactly like any other change — there is no separate delete path', async () => {
    const deletedAt = new Date('2026-09-03T00:00:00Z');
    const { repository, upsert } = setup([row({ deletedAt })]);
    const worker = Worker.create({
      id: 'worker-1',
      organizationId: 'org-1',
      name: 'Karim Benali',
      hourlyRate: 18.5,
      deletedAt,
    });

    await repository.save(worker);

    // What was actually handed to Prisma to write — the mapper's job, not the
    // repository's, but the seam a wrong `toPersistence` breaks silently.
    const { create } = upsert.mock.calls[0][0] as { create: { deletedAt: Date | null } };
    expect(create.deletedAt).toEqual(deletedAt);
  });
});
