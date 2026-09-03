import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Worker } from '../../domain/entities/worker.entity';
import { WorkerRepository } from './worker.repository';

/**
 * The query side, against a Prisma double.
 *
 * Three things worth pinning without a database:
 *
 *   1. **No tenant clause is written here.** The extension adds it, and a
 *      hand-written `organizationId` in the `where` would be the beginning of
 *      two mechanisms for one rule (docs/09).
 *   2. **The default order is alphabetical.** A payroll is read by name; "who
 *      did we add last" is not a question anybody asks of it.
 *   3. **`countTimesheets` counts the right person.** It is the single value the
 *      deletion guard depends on — get it wrong and the guard either blocks
 *      everything or protects nothing.
 */

function setup(rows: unknown[] = []) {
  const findMany = vi.fn(async () => rows);
  const count = vi.fn(async () => rows.length);
  const findUnique = vi.fn(async () => rows[0] ?? null);
  const upsert = vi.fn(async () => rows[0]);
  const deleteFn = vi.fn(async () => rows[0]);
  const timesheetCount = vi.fn(async () => 7);

  const prisma = {
    worker: { findMany, count, findUnique, upsert, delete: deleteFn },
    timesheet: { count: timesheetCount },
  } as unknown as TenantPrismaClient;

  return {
    findMany,
    findUnique,
    upsert,
    deleteFn,
    timesheetCount,
    repository: new WorkerRepository(prisma),
  };
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
  it('reads one by id', async () => {
    const { repository, findUnique } = setup([row()]);

    const worker = await repository.findById('worker-1');

    expect(worker?.name).toBe('Karim Benali');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'worker-1' } });
  });

  it('answers null for an unknown id', async () => {
    const { repository } = setup([]);

    expect(await repository.findById('nope')).toBeNull();
  });

  it('counts the timesheets of that worker, and only that worker', async () => {
    const { repository, timesheetCount } = setup([row()]);

    expect(await repository.countTimesheets('worker-1')).toBe(7);
    expect(timesheetCount).toHaveBeenCalledWith({ where: { workerId: 'worker-1' } });
  });

  it('deletes by id', async () => {
    const { repository, deleteFn } = setup([row()]);

    await repository.delete('worker-1');

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'worker-1' } });
  });
});
