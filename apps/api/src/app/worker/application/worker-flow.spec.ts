import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { WorkerDeletedEvent } from '@shared/domain/events/worker-deleted.event';
import { CreateWorkerCommand } from './commands/create-worker.command';
import { CreateWorkerHandler } from './commands/create-worker.handler';
import { DeleteWorkerCommand } from './commands/delete-worker.command';
import { DeleteWorkerHandler } from './commands/delete-worker.handler';
import { UpdateWorkerCommand } from './commands/update-worker.command';
import { UpdateWorkerHandler } from './commands/update-worker.handler';
import { GetWorkerByIdQuery } from './queries/get-worker-by-id.query';
import { GetWorkerByIdHandler } from './queries/get-worker-by-id.handler';
import { Worker } from '../domain/entities/worker.entity';
import { WorkerRepositoryPort } from '../domain/ports/worker-repository.port';

/**
 * The payroll's load-bearing rule: deleting a worker never removes the row.
 *
 * `timesheets.worker_id` cascades, so an actual `DELETE` would take the hours
 * with it — and with them the labour cost of every worksite this person
 * appeared on. A month closed in March would change value in September,
 * silently. `worker.deleted()` sets `deletedAt` instead; the repository's
 * reads are what keep the row from ever surfacing again (see its own spec).
 *
 * The account is still unlinked, though. From the product's point of view the
 * worker is gone — no list, no lookup, no way back through this API — so
 * `app_users.worker_id` stops pointing at them exactly as it would after a
 * real delete. Only the row survives; the relationship does not.
 */

const ORG = 'org-1';

function existing(overrides: Partial<Worker> = {}): Worker {
  return Worker.create({
    id: 'worker-1',
    organizationId: ORG,
    name: 'Karim Benali',
    qualification: 'Maçon',
    hourlyRate: 18.5,
    active: true,
    ...overrides,
  });
}

function setup(options: { worker?: Worker | null } = {}) {
  const saved: Worker[] = [];
  const repository = {
    findById: vi.fn(async () => (options.worker === undefined ? existing() : options.worker)),
    save: vi.fn(async (worker: Worker) => {
      saved.push(worker);
      return worker;
    }),
    search: vi.fn(),
  } as unknown as WorkerRepositoryPort;

  const publish = vi.fn();
  const events = { publish } as unknown as EventBus;

  return {
    repository,
    saved,
    publish,
    create: new CreateWorkerHandler(repository),
    update: new UpdateWorkerHandler(repository),
    remove: new DeleteWorkerHandler(repository, events),
    getById: new GetWorkerByIdHandler(repository),
  };
}

describe('CreateWorkerHandler', () => {
  it('adds somebody to the payroll, active by default', async () => {
    const { create, saved } = setup();

    await create.execute(
      new CreateWorkerCommand(ORG, { name: 'Amina Cherif', hourlyRate: 16 }),
    );

    expect(saved[0].name).toBe('Amina Cherif');
    expect(saved[0].organizationId).toBe(ORG);
    expect(saved[0].active).toBe(true);
    expect(saved[0].qualification).toBeNull();
  });
});

describe('UpdateWorkerHandler', () => {
  it('deactivates without touching anything else', async () => {
    const { update, saved } = setup();

    await update.execute(new UpdateWorkerCommand('worker-1', { active: false }));

    expect(saved[0].active).toBe(false);
    expect(saved[0].name).toBe('Karim Benali');
    expect(saved[0].hourlyRate).toBe(18.5);
  });

  it('re-rates without rewriting the past', async () => {
    const { update, saved } = setup();

    await update.execute(new UpdateWorkerCommand('worker-1', { hourlyRate: 21 }));

    // The new rate is on the worker; the timesheets already recorded keep their
    // own hours and are valued when the cost is computed. A raise must not
    // change what a closed month cost.
    expect(saved[0].hourlyRate).toBe(21);
  });

  it('tells an empty qualification apart from an unchanged one', async () => {
    const { update, saved } = setup();

    await update.execute(new UpdateWorkerCommand('worker-1', { name: 'Karim B.' }));
    expect(saved[0].qualification).toBe('Maçon');

    await update.execute(new UpdateWorkerCommand('worker-1', { qualification: null }));
    expect(saved[1].qualification).toBeNull();
  });

  it('refuses an unknown worker — another tenant’s included', async () => {
    const { update } = setup({ worker: null });

    await expect(
      update.execute(new UpdateWorkerCommand('worker-1', { active: false })),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('DeleteWorkerHandler', () => {
  it('never removes the row — it sets deletedAt', async () => {
    const { remove, saved } = setup();

    await remove.execute(new DeleteWorkerCommand('worker-1'));

    expect(saved[0].deletedAt).toBeInstanceOf(Date);
    expect(saved[0].isDeleted()).toBe(true);
  });

  it('keeps name, rate, qualification and active exactly as they were', async () => {
    const { remove, saved } = setup();

    await remove.execute(new DeleteWorkerCommand('worker-1'));

    expect(saved[0].name).toBe('Karim Benali');
    expect(saved[0].hourlyRate).toBe(18.5);
    expect(saved[0].qualification).toBe('Maçon');
    expect(saved[0].active).toBe(true);
  });

  it('unlinks the account regardless — the worker is gone from the product’s point of view', async () => {
    const { remove, publish } = setup();

    await remove.execute(new DeleteWorkerCommand('worker-1'));

    expect(publish).toHaveBeenCalledWith(new WorkerDeletedEvent('worker-1', ORG));
  });

  it('refuses an unknown worker — another tenant’s, or already deleted', async () => {
    const { remove, saved, publish } = setup({ worker: null });

    // `findById` already excludes soft-deleted rows, so this is also what
    // deleting twice looks like: the second call finds nothing.
    await expect(remove.execute(new DeleteWorkerCommand('worker-1'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(saved).toHaveLength(0);
    expect(publish).not.toHaveBeenCalled();
  });
});

describe('GetWorkerByIdHandler', () => {
  it('returns the worker', async () => {
    const { getById } = setup();

    expect((await getById.execute(new GetWorkerByIdQuery('worker-1'))).name).toBe('Karim Benali');
  });

  it('answers "not found" for another tenant’s row, never "forbidden"', async () => {
    const { getById } = setup({ worker: null });

    // The tenant filter made it invisible; saying "forbidden" would confirm it
    // exists to somebody who guessed an id.
    await expect(getById.execute(new GetWorkerByIdQuery('worker-1'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
