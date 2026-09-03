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
import { WorkerHasHistoryException } from '../domain/exceptions/worker.exceptions';
import { WorkerRepositoryPort } from '../domain/ports/worker-repository.port';

/**
 * The payroll's two load-bearing rules.
 *
 * **A worker with hours cannot be deleted.** `timesheets.worker_id` cascades, so
 * the deletion would take the hours with it — and with them the labour cost of
 * every worksite this person appeared on. A month closed in March would change
 * value in September, silently. This is the single most expensive mistake the
 * module can make, and it is one `count` away from happening.
 *
 * **A deletion tells identity.** `app_users.worker_id` is a soft reference: no
 * foreign key crosses the schema boundary, so nothing in the database clears it.
 * If the event stops being published, accounts keep pointing at rows that no
 * longer exist and nothing complains.
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

function setup(options: { worker?: Worker | null; timesheets?: number } = {}) {
  const saved: Worker[] = [];
  const repository = {
    findById: vi.fn(async () => (options.worker === undefined ? existing() : options.worker)),
    countTimesheets: vi.fn(async () => options.timesheets ?? 0),
    save: vi.fn(async (worker: Worker) => {
      saved.push(worker);
      return worker;
    }),
    delete: vi.fn(async () => {}),
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
  it('deletes somebody who was never counted', async () => {
    const { remove, repository, publish } = setup({ timesheets: 0 });

    await remove.execute(new DeleteWorkerCommand('worker-1'));

    expect(repository.delete).toHaveBeenCalledWith('worker-1');
    expect(publish).toHaveBeenCalledWith(new WorkerDeletedEvent('worker-1', ORG));
  });

  it('refuses as soon as one timesheet points at them', async () => {
    const { remove, repository } = setup({ timesheets: 1 });

    await expect(remove.execute(new DeleteWorkerCommand('worker-1'))).rejects.toBeInstanceOf(
      WorkerHasHistoryException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('says how many, and what to do instead', async () => {
    const { remove } = setup({ timesheets: 42 });

    await expect(remove.execute(new DeleteWorkerCommand('worker-1'))).rejects.toThrow(
      /42 timesheets.*Deactivate them instead/,
    );
  });

  it('publishes nothing when the deletion is refused', async () => {
    const { remove, publish } = setup({ timesheets: 3 });

    await remove.execute(new DeleteWorkerCommand('worker-1')).catch(() => undefined);

    // An account must not lose its link to a worker that is still there.
    expect(publish).not.toHaveBeenCalled();
  });

  it('refuses an unknown worker before counting anything', async () => {
    const { remove, repository } = setup({ worker: null });

    await expect(remove.execute(new DeleteWorkerCommand('worker-1'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(repository.countTimesheets).not.toHaveBeenCalled();
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
