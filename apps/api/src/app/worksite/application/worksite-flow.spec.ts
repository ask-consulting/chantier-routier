import { describe, expect, it, vi } from 'vitest';
import { WorksiteStatus } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { CreateWorksiteCommand } from './commands/create-worksite.command';
import { CreateWorksiteHandler } from './commands/create-worksite.handler';
import { DeleteWorksiteCommand } from './commands/delete-worksite.command';
import { DeleteWorksiteHandler } from './commands/delete-worksite.handler';
import { UpdateWorksiteCommand } from './commands/update-worksite.command';
import { UpdateWorksiteHandler } from './commands/update-worksite.handler';
import { Worksite } from '../domain/entities/worksite.entity';
import {
  InvalidWorksiteScheduleException,
  UnknownWorksiteClientException,
} from '../domain/exceptions/worksite.exceptions';
import { WorksiteRepositoryPort } from '../domain/ports/worksite-repository.port';

/**
 * The write side of a worksite, against a repository double.
 *
 * The load-bearing rule is the same one the payroll follows: deleting never
 * removes the row. Timesheets and expenses cascade from it, so an actual
 * `DELETE` would erase hours somebody was paid for. `worksite.deleted()` sets
 * `deletedAt`; the repository's reads make it disappear (see its own spec).
 */

function existing(overrides: Partial<Parameters<typeof Worksite.create>[0]> = {}): Worksite {
  return Worksite.create({
    id: 'worksite-1',
    organizationId: 'org-1',
    code: 'RN7-2026',
    name: 'Réfection RN7',
    clientId: 'client-1',
    client: { id: 'client-1', displayName: 'Municipalité de Sousse' },
    address: 'RN7, PK 12',
    plannedStartDate: new Date('2026-09-01'),
    plannedEndDate: new Date('2026-12-15'),
    status: WorksiteStatus.IN_PROGRESS,
    totalBudget: 250_000,
    ...overrides,
  });
}

function setup(options: { worksite?: Worksite | null; assignable?: boolean } = {}) {
  const saved: Worksite[] = [];
  const repository = {
    findById: vi.fn(async () => (options.worksite === undefined ? existing() : options.worksite)),
    save: vi.fn(async (worksite: Worksite) => {
      saved.push(worksite);
      return worksite;
    }),
    search: vi.fn(),
    isAssignableClient: vi.fn(async () => options.assignable ?? true),
    findCostInputs: vi.fn(),
  } as unknown as WorksiteRepositoryPort;

  return { repository, saved };
}

describe('CreateWorksiteHandler', () => {
  it('refuses an end date before the start date', async () => {
    const { repository } = setup();

    await expect(
      new CreateWorksiteHandler(repository).execute(
        new CreateWorksiteCommand('org-1', {
          code: 'X',
          name: 'X',
          plannedStartDate: '2026-10-01',
          plannedEndDate: '2026-09-01',
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidWorksiteScheduleException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('accepts a one-day worksite', async () => {
    const { repository, saved } = setup();

    await new CreateWorksiteHandler(repository).execute(
      new CreateWorksiteCommand('org-1', {
        code: 'X',
        name: 'X',
        plannedStartDate: '2026-10-01',
        plannedEndDate: '2026-10-01',
      }),
    );

    expect(saved).toHaveLength(1);
  });
});

describe('UpdateWorksiteHandler', () => {
  it('changes only what the payload names', async () => {
    const { repository, saved } = setup();

    await new UpdateWorksiteHandler(repository).execute(
      new UpdateWorksiteCommand('worksite-1', { status: WorksiteStatus.COMPLETED }),
    );

    expect(saved[0].status).toBe(WorksiteStatus.COMPLETED);
    expect(saved[0].name).toBe('Réfection RN7');
    expect(saved[0].clientId).toBe('client-1');
    expect(saved[0].client?.displayName).toBe('Municipalité de Sousse');
    expect(saved[0].totalBudget).toBe(250_000);
    expect(saved[0].plannedStartDate).toEqual(new Date('2026-09-01'));
  });

  it('clears a field on null, and leaves it on undefined', async () => {
    const { repository, saved } = setup();

    await new UpdateWorksiteHandler(repository).execute(
      new UpdateWorksiteCommand('worksite-1', {
        clientId: null,
        totalBudget: null,
        plannedEndDate: null,
      }),
    );

    expect(saved[0].clientId).toBeNull();
    expect(saved[0].client).toBeNull();
    expect(saved[0].totalBudget).toBeNull();
    expect(saved[0].plannedEndDate).toBeNull();
    expect(saved[0].address).toBe('RN7, PK 12');
  });

  it('checks the schedule on the merged result, not on the payload alone', async () => {
    const { repository } = setup();

    // Only the end moves — before the unchanged start of 2026-09-01.
    await expect(
      new UpdateWorksiteHandler(repository).execute(
        new UpdateWorksiteCommand('worksite-1', { plannedEndDate: '2026-08-01' }),
      ),
    ).rejects.toBeInstanceOf(InvalidWorksiteScheduleException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('answers not-found for an unknown worksite, or another tenant’s', async () => {
    const { repository } = setup({ worksite: null });

    await expect(
      new UpdateWorksiteHandler(repository).execute(
        new UpdateWorksiteCommand('nope', { name: 'X' }),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('the client a worksite points at', () => {
  it('refuses a client that is not assignable — foreign, deleted or unknown', async () => {
    const { repository } = setup({ assignable: false });

    await expect(
      new CreateWorksiteHandler(repository).execute(
        new CreateWorksiteCommand('org-1', { code: 'X', name: 'X', clientId: 'client-9' }),
      ),
    ).rejects.toBeInstanceOf(UnknownWorksiteClientException);
    await expect(
      new UpdateWorksiteHandler(repository).execute(
        new UpdateWorksiteCommand('worksite-1', { clientId: 'client-9' }),
      ),
    ).rejects.toBeInstanceOf(UnknownWorksiteClientException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not re-check the client the worksite already has', async () => {
    const { repository, saved } = setup({ assignable: false });

    await new UpdateWorksiteHandler(repository).execute(
      new UpdateWorksiteCommand('worksite-1', { clientId: 'client-1', name: 'Autre nom' }),
    );

    expect(repository.isAssignableClient).not.toHaveBeenCalled();
    expect(saved[0].client?.displayName).toBe('Municipalité de Sousse');
  });

  it('drops the old client’s name when the client changes', async () => {
    const { repository, saved } = setup();

    await new UpdateWorksiteHandler(repository).execute(
      new UpdateWorksiteCommand('worksite-1', { clientId: 'client-2' }),
    );

    expect(saved[0].clientId).toBe('client-2');
    // Not the previous client's name under the new id — the read-back fills it.
    expect(saved[0].client).toBeNull();
  });

  it('creates without a client without asking about one', async () => {
    const { repository } = setup();

    await new CreateWorksiteHandler(repository).execute(
      new CreateWorksiteCommand('org-1', { code: 'X', name: 'X' }),
    );

    expect(repository.isAssignableClient).not.toHaveBeenCalled();
  });
});

describe('DeleteWorksiteHandler', () => {
  it('sets deletedAt and keeps everything else — never a real delete', async () => {
    const { repository, saved } = setup();

    await new DeleteWorksiteHandler(repository).execute(new DeleteWorksiteCommand('worksite-1'));

    expect(saved).toHaveLength(1);
    expect(saved[0].isDeleted()).toBe(true);
    expect(saved[0].code).toBe('RN7-2026');
    expect(saved[0].totalBudget).toBe(250_000);
    // The port has no `delete` at all — this is the only write path.
    expect(repository).not.toHaveProperty('delete');
  });

  it('answers not-found for an unknown worksite — including one already deleted', async () => {
    // `findById` excludes soft-deleted rows, so a second delete reads as gone.
    const { repository } = setup({ worksite: null });

    await expect(
      new DeleteWorksiteHandler(repository).execute(new DeleteWorksiteCommand('worksite-1')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
