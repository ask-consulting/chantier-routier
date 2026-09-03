import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { CreateWorkerCommand } from '../../application/commands/create-worker.command';
import { DeleteWorkerCommand } from '../../application/commands/delete-worker.command';
import { UpdateWorkerCommand } from '../../application/commands/update-worker.command';
import { GetWorkerByIdQuery } from '../../application/queries/get-worker-by-id.query';
import { GetWorkersQuery } from '../../application/queries/get-workers.query';
import { Worker } from '../../domain/entities/worker.entity';
import { WorkerController } from './worker.controller';

/**
 * What actually leaves the server, and what the controller passes down.
 *
 * The property this file exists for: **a worker never carries anything that
 * could sign in.** An HR record and an account are two different things about
 * the same person, and the day somebody adds an email to the payroll to save a
 * join, this is what should refuse.
 *
 * The second one is the tenant: reads take no organization at all — the Prisma
 * layer scopes them from the token — and only the creation names it. A query
 * that grew an `organizationId` parameter would mean two mechanisms for one
 * rule, which is how a leak starts.
 */

function aWorker(): Worker {
  return Worker.create({
    id: 'worker-1',
    organizationId: 'org-1',
    name: 'Karim Benali',
    qualification: 'Maçon',
    hourlyRate: 18.5,
    active: true,
    createdAt: new Date('2026-09-01T00:00:00Z'),
  });
}

/** The serialised payload is the contract; the DTO instance is not. */
function onTheWire(dto: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
}

function build(worker = aWorker()) {
  const queryBus = {
    execute: vi.fn().mockResolvedValue({ items: [worker], total: 1, page: 1, limit: 20 }),
  } as unknown as QueryBus;
  const commandBus = { execute: vi.fn().mockResolvedValue(worker) } as unknown as CommandBus;

  return { queryBus, commandBus, controller: new WorkerController(queryBus, commandBus) };
}

describe('WorkerController', () => {
  it('returns an HR record and nothing that could authenticate', async () => {
    const { controller } = build();

    const page = await controller.findAll({});
    const payload = onTheWire(page.items[0]);

    expect(payload).toMatchObject({
      id: 'worker-1',
      name: 'Karim Benali',
      qualification: 'Maçon',
      hourlyRate: 18.5,
      active: true,
    });
    // No email, no role, no password — a worker is not an account.
    for (const forbidden of ['email', 'role', 'passwordHash', 'password', 'locale']) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });

  it('passes the filters down without inventing a tenant', async () => {
    const { controller, queryBus } = build();

    await controller.findAll({ search: 'maçon', active: true, page: 2, sortField: 'hourlyRate' });

    const query = (queryBus.execute as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as GetWorkersQuery;
    expect(query.params.filters).toEqual({ search: 'maçon', active: true });
    expect(query.params.page).toBe(2);
    expect(query.params.sort).toEqual({ field: 'hourlyRate', order: 'asc' });
    // Reads are scoped by the Prisma extension from the token — never by a
    // parameter a caller could set.
    expect(JSON.stringify(query)).not.toContain('organizationId');
  });

  it('reads one worker by id', async () => {
    const { controller, queryBus } = build();
    (queryBus.execute as ReturnType<typeof vi.fn>).mockResolvedValue(aWorker());

    const worker = await controller.findOne('worker-1');

    expect(worker.name).toBe('Karim Benali');
    expect(
      ((queryBus.execute as ReturnType<typeof vi.fn>).mock.calls[0][0] as GetWorkerByIdQuery)
        .workerId,
    ).toBe('worker-1');
  });

  it('names the organization on creation, and takes it from the token', async () => {
    const { controller, commandBus } = build();

    await controller.create('org-1', { name: 'Amina Cherif', hourlyRate: 16 });

    const command = (commandBus.execute as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as CreateWorkerCommand;
    expect(command).toBeInstanceOf(CreateWorkerCommand);
    // The row itself carries the column, so the write is the one place that
    // names it — and the value comes from `@CurrentUser`, not from the body.
    expect(command.organizationId).toBe('org-1');
    expect(command.data.name).toBe('Amina Cherif');
  });

  it('sends a deactivation as an ordinary update', async () => {
    const { controller, commandBus } = build();

    await controller.update('worker-1', { active: false });

    const command = (commandBus.execute as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as UpdateWorkerCommand;
    expect(command.workerId).toBe('worker-1');
    expect(command.data).toEqual({ active: false });
  });

  it('deletes through the soft-delete command, and returns nothing to reach', async () => {
    const { controller, commandBus } = build();

    const result = await controller.remove('worker-1');

    expect((commandBus.execute as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(
      DeleteWorkerCommand,
    );
    // 204: the row survives behind the scenes, but there is nothing left the
    // caller can do with it through this API.
    expect(result).toBeUndefined();
  });
});
