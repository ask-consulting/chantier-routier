import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcquisitionMethod } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { CreateEquipmentAssignmentCommand } from './commands/create-equipment-assignment.command';
import { CreateEquipmentAssignmentHandler } from './commands/create-equipment-assignment.handler';
import { DeleteEquipmentAssignmentCommand } from './commands/delete-equipment-assignment.command';
import { DeleteEquipmentAssignmentHandler } from './commands/delete-equipment-assignment.handler';
import { UpdateEquipmentAssignmentCommand } from './commands/update-equipment-assignment.command';
import { UpdateEquipmentAssignmentHandler } from './commands/update-equipment-assignment.handler';
import { GetEquipmentAssignmentsHandler } from './queries/get-equipment-assignments.handler';
import { GetEquipmentAssignmentsQuery } from './queries/get-equipment-assignments.query';
import { EquipmentAssignment } from '../domain/entities/equipment-assignment.entity';
import { Equipment } from '../domain/entities/equipment.entity';
import {
  AssignmentHistoryLockedException,
  EquipmentAlreadyAssignedException,
  InvalidAssignmentException,
} from '../domain/exceptions/equipment-assignment.exceptions';
import { EquipmentAssignmentRepositoryPort } from '../domain/ports/equipment-assignment-repository.port';
import { EquipmentRepositoryPort } from '../domain/ports/equipment-repository.port';

/**
 * Putting a machine on a worksite. The rules that need the rest of the fleet:
 *
 *   - the machine and the worksite are the caller's organization's, and current;
 *   - the machine is there over the days — acquired by then, not yet disposed
 *     of, its lease or hire still running;
 *   - it is nowhere else on any of those days.
 */

const SOUSSE = { id: 'ws-1', code: 'RN1-2026', name: 'Réfection RN1' };
const MONASTIR = { id: 'ws-2', code: 'MN-04', name: 'Rocade Monastir' };

/** Hired from 2026-03-01 to 2026-12-31 at 450 a day. */
const roller = Equipment.create({
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'tandem_roller',
  designation: 'Compacteur HAMM',
  acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
  acquisitionDate: '2026-03-01',
  dailyRate: 450,
  contractEndDate: '2026-12-31',
});

function booked(overrides: Partial<{ id: string; startDate: string; endDate: string }> = {}) {
  return EquipmentAssignment.create(
    {
      id: 'as-1',
      organizationId: 'org-1',
      equipmentId: 'eq-1',
      worksiteId: SOUSSE.id,
      startDate: '2026-04-01',
      endDate: '2026-04-10',
      ...overrides,
    },
    { equipment: roller, worksite: SOUSSE },
  );
}

function setup(
  options: {
    machine?: Equipment | null;
    worksite?: typeof SOUSSE | null;
    overlapping?: EquipmentAssignment[];
    current?: EquipmentAssignment | null;
  } = {},
) {
  const saved: EquipmentAssignment[] = [];
  const assignments = {
    search: vi.fn(async () => ({ items: [], total: 0, page: 1, limit: 20 })),
    findById: vi.fn(async () => (options.current === undefined ? booked() : options.current)),
    save: vi.fn(async (assignment: EquipmentAssignment) => {
      saved.push(assignment);
      return assignment;
    }),
    delete: vi.fn(async () => undefined),
    findOverlapping: vi.fn(async () => options.overlapping ?? []),
    countOutside: vi.fn(),
    countEndingFrom: vi.fn(),
    findWorksite: vi.fn(async () => (options.worksite === undefined ? MONASTIR : options.worksite)),
  } satisfies EquipmentAssignmentRepositoryPort;
  const equipment = {
    search: vi.fn(),
    findById: vi.fn(async () => (options.machine === undefined ? roller : options.machine)),
    save: vi.fn(),
  } satisfies EquipmentRepositoryPort;
  return { assignments, equipment, saved };
}

// Today is 2026-03-25: the booking of 2026-04-01 → 04-10 has not started.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-25T10:00:00Z'));
});

afterEach(() => vi.useRealTimers());

function create(dates: { startDate: string; endDate: string }) {
  return new CreateEquipmentAssignmentCommand('org-1', {
    equipmentId: 'eq-1',
    worksiteId: MONASTIR.id,
    ...dates,
  });
}

describe('CreateEquipmentAssignmentHandler', () => {
  it('books the machine, priced over the whole period', async () => {
    const { assignments, equipment, saved } = setup();

    await new CreateEquipmentAssignmentHandler(assignments, equipment).execute(
      create({ startDate: '2026-05-01', endDate: '2026-05-10' }),
    );

    expect(saved[0].days).toBe(10);
    expect(saved[0].cost).toBe(4_500);
    expect(saved[0].worksite).toEqual(MONASTIR);
    expect(assignments.findOverlapping).toHaveBeenCalledWith(
      'eq-1',
      expect.objectContaining({ startDate: '2026-05-01', endDate: '2026-05-10' }),
      saved[0].id,
    );
  });

  it('refuses an unknown machine and an unknown worksite, each on its field', async () => {
    await expect(
      new CreateEquipmentAssignmentHandler(
        setup({ machine: null }).assignments,
        setup({ machine: null }).equipment,
      ).execute(create({ startDate: '2026-05-01', endDate: '2026-05-02' })),
    ).rejects.toMatchObject({ fieldErrors: [{ field: 'equipmentId' }] });

    const { assignments, equipment } = setup({ worksite: null });
    await expect(
      new CreateEquipmentAssignmentHandler(assignments, equipment).execute(
        create({ startDate: '2026-05-01', endDate: '2026-05-02' }),
      ),
    ).rejects.toMatchObject({ fieldErrors: [{ field: 'worksiteId' }] });
  });

  it('refuses days before the machine arrives, or after its hire ends', async () => {
    const { assignments, equipment } = setup();
    const handler = new CreateEquipmentAssignmentHandler(assignments, equipment);

    await expect(
      handler.execute(create({ startDate: '2026-02-20', endDate: '2026-03-05' })),
    ).rejects.toMatchObject({ fieldErrors: [{ code: 'form.errors.beforeEquipmentAvailable' }] });
    await expect(
      handler.execute(create({ startDate: '2026-12-20', endDate: '2027-01-05' })),
    ).rejects.toMatchObject({ fieldErrors: [{ code: 'form.errors.afterEquipmentAvailable' }] });
  });

  it('refuses a machine already on another worksite for one of the days, naming it', async () => {
    const { assignments, equipment } = setup({ overlapping: [booked()] });

    const attempt = new CreateEquipmentAssignmentHandler(assignments, equipment).execute(
      create({ startDate: '2026-04-10', endDate: '2026-04-20' }),
    );

    await expect(attempt).rejects.toBeInstanceOf(EquipmentAlreadyAssignedException);
    await expect(attempt).rejects.toThrow(/RN1-2026 Réfection RN1 from 2026-04-01 to 2026-04-10/);
    expect(assignments.save).not.toHaveBeenCalled();
  });

  it('refuses a period that runs backwards', async () => {
    const { assignments, equipment } = setup();

    await expect(
      new CreateEquipmentAssignmentHandler(assignments, equipment).execute(
        create({ startDate: '2026-05-10', endDate: '2026-05-01' }),
      ),
    ).rejects.toBeInstanceOf(InvalidAssignmentException);
  });
});

describe('UpdateEquipmentAssignmentHandler', () => {
  it('moves the dates, checking the overlap without counting itself', async () => {
    const { assignments, equipment, saved } = setup();

    await new UpdateEquipmentAssignmentHandler(assignments, equipment).execute(
      new UpdateEquipmentAssignmentCommand('as-1', { endDate: '2026-04-15' }),
    );

    expect(saved[0].endDate).toBe('2026-04-15');
    expect(assignments.findOverlapping.mock.calls[0][2]).toBe('as-1');
    expect(assignments.findWorksite).not.toHaveBeenCalled();
  });

  it('moves it to another worksite, which must exist', async () => {
    const { assignments, equipment, saved } = setup();

    await new UpdateEquipmentAssignmentHandler(assignments, equipment).execute(
      new UpdateEquipmentAssignmentCommand('as-1', { worksiteId: MONASTIR.id }),
    );
    expect(saved[0].worksiteId).toBe(MONASTIR.id);

    const refused = setup({ worksite: null });
    await expect(
      new UpdateEquipmentAssignmentHandler(refused.assignments, refused.equipment).execute(
        new UpdateEquipmentAssignmentCommand('as-1', { worksiteId: 'ws-9' }),
      ),
    ).rejects.toMatchObject({ fieldErrors: [{ field: 'worksiteId' }] });
  });

  it('answers not-found for an unknown assignment, and refuses one whose machine is gone', async () => {
    const missing = setup({ current: null });
    await expect(
      new UpdateEquipmentAssignmentHandler(missing.assignments, missing.equipment).execute(
        new UpdateEquipmentAssignmentCommand('nope', {}),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);

    const orphan = setup({ machine: null });
    await expect(
      new UpdateEquipmentAssignmentHandler(orphan.assignments, orphan.equipment).execute(
        new UpdateEquipmentAssignmentCommand('as-1', { notes: 'x' }),
      ),
    ).rejects.toMatchObject({ fieldErrors: [{ field: 'equipmentId' }] });
  });
});

describe('the days that already happened', () => {
  // Today is 2026-04-05: the booking of 04-01 → 04-10 is in progress.
  beforeEach(() => vi.setSystemTime(new Date('2026-04-05T10:00:00Z')));

  it('lets an assignment in progress be ended today', async () => {
    const { assignments, equipment, saved } = setup();

    await new UpdateEquipmentAssignmentHandler(assignments, equipment).execute(
      new UpdateEquipmentAssignmentCommand('as-1', { endDate: '2026-04-05' }),
    );

    expect(saved[0].endDate).toBe('2026-04-05');
  });

  it('refuses to move it elsewhere, shift its start, or trim a day that happened', async () => {
    const { assignments, equipment } = setup();
    const handler = new UpdateEquipmentAssignmentHandler(assignments, equipment);

    for (const [change, field] of [
      [{ worksiteId: MONASTIR.id }, 'worksiteId'],
      [{ startDate: '2026-04-02' }, 'startDate'],
      [{ endDate: '2026-04-03' }, 'endDate'],
    ] as const) {
      await expect(
        handler.execute(new UpdateEquipmentAssignmentCommand('as-1', change)),
      ).rejects.toMatchObject({ fieldErrors: [{ field, code: 'form.errors.assignmentHistoryLocked' }] });
    }
    expect(assignments.save).not.toHaveBeenCalled();
  });

  it('refuses to delete it — it is ended instead', async () => {
    const { assignments } = setup();

    await expect(
      new DeleteEquipmentAssignmentHandler(assignments).execute(
        new DeleteEquipmentAssignmentCommand('as-1'),
      ),
    ).rejects.toBeInstanceOf(AssignmentHistoryLockedException);
    expect(assignments.delete).not.toHaveBeenCalled();
  });

  it('lets whoever may correct history do both', async () => {
    const { assignments, equipment, saved } = setup();

    await new UpdateEquipmentAssignmentHandler(assignments, equipment).execute(
      new UpdateEquipmentAssignmentCommand('as-1', { startDate: '2026-04-02' }, true),
    );
    await new DeleteEquipmentAssignmentHandler(assignments).execute(
      new DeleteEquipmentAssignmentCommand('as-1', true),
    );

    expect(saved[0].startDate).toBe('2026-04-02');
    expect(assignments.delete).toHaveBeenCalledWith('as-1');
  });
});

describe('DeleteEquipmentAssignmentHandler and the query', () => {
  it('really deletes one that has not started — nothing hangs off it', async () => {
    const { assignments } = setup();

    await new DeleteEquipmentAssignmentHandler(assignments).execute(
      new DeleteEquipmentAssignmentCommand('as-1'),
    );

    expect(assignments.delete).toHaveBeenCalledWith('as-1');
  });

  it('answers not-found for an unknown one', async () => {
    const { assignments } = setup({ current: null });

    await expect(
      new DeleteEquipmentAssignmentHandler(assignments).execute(
        new DeleteEquipmentAssignmentCommand('nope'),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(assignments.delete).not.toHaveBeenCalled();
  });

  it('hands the search through', async () => {
    const { assignments } = setup();
    const params = { filters: { worksiteId: SOUSSE.id } };

    await new GetEquipmentAssignmentsHandler(assignments).execute(
      new GetEquipmentAssignmentsQuery(params),
    );

    expect(assignments.search).toHaveBeenCalledWith(params);
  });
});

describe('EquipmentAssignment', () => {
  it('trims its notes, counts its days, and drops the worksite it no longer names', () => {
    const assignment = booked();

    expect(assignment.days).toBe(10);
    expect(assignment.with({ notes: '  avec chauffeur  ' }).notes).toBe('avec chauffeur');
    expect(assignment.with({ notes: null }).notes).toBeNull();
    expect(assignment.with({ worksiteId: MONASTIR.id }).worksite).toBeNull();
    expect(assignment.with({ worksiteId: SOUSSE.id }).worksite).toEqual(SOUSSE);
  });

  it('has no cost when its machine was not loaded', () => {
    const bare = EquipmentAssignment.create({
      id: 'as-2',
      organizationId: 'org-1',
      equipmentId: 'eq-1',
      worksiteId: SOUSSE.id,
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-01',
    });

    expect(bare.cost).toBeNull();
    expect(bare.startDate).toBe('2026-04-01');
    expect(bare.days).toBe(1);
  });
});
