import { afterEach, describe, expect, it, vi } from 'vitest';
import { AcquisitionMethod, EquipmentStatus } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { CreateEquipmentCommand } from './commands/create-equipment.command';
import { CreateEquipmentHandler } from './commands/create-equipment.handler';
import { DeleteEquipmentCommand } from './commands/delete-equipment.command';
import { DeleteEquipmentHandler } from './commands/delete-equipment.handler';
import { UpdateEquipmentCommand } from './commands/update-equipment.command';
import { UpdateEquipmentHandler } from './commands/update-equipment.handler';
import { GetEquipmentByIdHandler } from './queries/get-equipment-by-id.handler';
import { GetEquipmentByIdQuery } from './queries/get-equipment-by-id.query';
import { GetEquipmentCatalogHandler } from './queries/get-equipment-catalog.handler';
import { GetEquipmentListHandler } from './queries/get-equipment-list.handler';
import { GetEquipmentListQuery } from './queries/get-equipment-list.query';
import { Equipment } from '../domain/entities/equipment.entity';
import {
  EquipmentAssignedOutsideException,
  EquipmentStillAssignedException,
} from '../domain/exceptions/equipment-assignment.exceptions';
import {
  InvalidEquipmentException,
  UnknownEquipmentTypeException,
} from '../domain/exceptions/equipment.exceptions';
import { EquipmentAssignmentRepositoryPort } from '../domain/ports/equipment-assignment-repository.port';
import { EquipmentCatalogPort } from '../domain/ports/equipment-catalog.port';
import { EquipmentRepositoryPort } from '../domain/ports/equipment-repository.port';

/**
 * The fleet's write side, against doubles. Two things are new here and worth
 * pinning: **the type comes from the catalog in the database** — an unknown
 * one is refused on its field, before the foreign key would answer 500 — and
 * **a machine cannot shrink under its assignments**: no disposal date, earlier
 * contract end or deletion may leave it booked on days it is gone.
 */

function existing(): Equipment {
  return Equipment.create({
    id: 'eq-1',
    organizationId: 'org-1',
    typeCode: 'motor_grader',
    designation: 'Niveleuse 140K',
    acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
    acquisitionDate: '2025-03-01',
    purchasePrice: 420_000,
    usefulLifeMonths: 60,
  });
}

function setup(
  options: { found?: Equipment | null; knownType?: boolean; outside?: number; booked?: number } = {},
) {
  const saved: Equipment[] = [];
  const repository = {
    search: vi.fn(async () => ({ items: [existing()], total: 1, page: 1, limit: 20 })),
    findById: vi.fn(async () => (options.found === undefined ? existing() : options.found)),
    save: vi.fn(async (equipment: Equipment) => {
      saved.push(equipment);
      return equipment;
    }),
  } satisfies EquipmentRepositoryPort;
  const catalog = {
    findType: vi.fn(async () => (options.knownType === false ? null : { defaultUsefulLifeMonths: 60 })),
    listCategories: vi.fn(async () => [
      { code: 'compaction', labelFr: 'Compactage', labelAr: 'الدمك', types: [] },
    ]),
  } satisfies EquipmentCatalogPort;
  const assignments = {
    search: vi.fn(),
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    findOverlapping: vi.fn(),
    countOutside: vi.fn(async () => options.outside ?? 0),
    countEndingFrom: vi.fn(async () => options.booked ?? 0),
    findWorksite: vi.fn(),
  } satisfies EquipmentAssignmentRepositoryPort;
  return { repository, catalog, assignments, saved };
}

afterEach(() => vi.useRealTimers());

describe('CreateEquipmentHandler', () => {
  it('takes the lifetime from the catalog, under the caller’s organization', async () => {
    const { repository, catalog, saved } = setup();

    await new CreateEquipmentHandler(repository, catalog).execute(
      new CreateEquipmentCommand('org-1', {
        typeCode: 'tandem_roller',
        designation: 'Compacteur tandem',
        acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
        acquisitionDate: '2026-09-01',
        purchasePrice: 219_000,
      }),
    );

    expect(catalog.findType).toHaveBeenCalledWith('tandem_roller');
    expect(saved[0].usefulLifeMonths).toBe(60);
    expect(saved[0].organizationId).toBe('org-1');
    expect(saved[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses a type the catalog does not have, on its field', async () => {
    const { repository, catalog } = setup({ knownType: false });

    const attempt = new CreateEquipmentHandler(repository, catalog).execute(
      new CreateEquipmentCommand('org-1', {
        typeCode: 'spaceship',
        designation: 'X',
        acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
        acquisitionDate: '2026-09-01',
        dailyRate: 1,
      }),
    );

    await expect(attempt).rejects.toBeInstanceOf(UnknownEquipmentTypeException);
    await expect(attempt).rejects.toMatchObject({ fieldErrors: [{ field: 'typeCode' }] });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refuses before saving when the fields do not hold together', async () => {
    const { repository, catalog } = setup();

    await expect(
      new CreateEquipmentHandler(repository, catalog).execute(
        new CreateEquipmentCommand('org-1', {
          typeCode: 'tandem_roller',
          designation: 'X',
          acquisitionMethod: AcquisitionMethod.LEASING,
          acquisitionDate: '2026-09-01',
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidEquipmentException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('UpdateEquipmentHandler', () => {
  it('retires a machine with its disposal date', async () => {
    const { repository, catalog, assignments, saved } = setup();

    await new UpdateEquipmentHandler(repository, catalog, assignments).execute(
      new UpdateEquipmentCommand('eq-1', {
        status: EquipmentStatus.RETIRED,
        disposalDate: '2026-09-01',
      }),
    );

    expect(saved[0].dailyCostOn('2026-09-02')).toBe(0);
    // The machine's new window, handed to the assignment check.
    expect(assignments.countOutside).toHaveBeenCalledWith('eq-1', '2025-03-01', '2026-09-01');
  });

  it('refuses to retire a machine still booked after its disposal date', async () => {
    const { repository, catalog, assignments } = setup({ outside: 2 });

    await expect(
      new UpdateEquipmentHandler(repository, catalog, assignments).execute(
        new UpdateEquipmentCommand('eq-1', {
          status: EquipmentStatus.RETIRED,
          disposalDate: '2026-09-01',
        }),
      ),
    ).rejects.toBeInstanceOf(EquipmentAssignedOutsideException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refuses a new type the catalog does not have', async () => {
    const { repository, catalog, assignments } = setup({ knownType: false });

    await expect(
      new UpdateEquipmentHandler(repository, catalog, assignments).execute(
        new UpdateEquipmentCommand('eq-1', { typeCode: 'spaceship' }),
      ),
    ).rejects.toBeInstanceOf(UnknownEquipmentTypeException);
  });

  it('answers not-found for an unknown or foreign machine', async () => {
    const { repository, catalog, assignments } = setup({ found: null });

    await expect(
      new UpdateEquipmentHandler(repository, catalog, assignments).execute(
        new UpdateEquipmentCommand('nope', {}),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('DeleteEquipmentHandler', () => {
  it('sets deletedAt — never a real delete — once nothing is booked from today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T10:00:00Z'));
    const { repository, assignments, saved } = setup();

    await new DeleteEquipmentHandler(repository, assignments).execute(new DeleteEquipmentCommand('eq-1'));

    expect(assignments.countEndingFrom).toHaveBeenCalledWith('eq-1', '2026-09-28');
    expect(saved[0].isDeleted()).toBe(true);
  });

  it('refuses while the machine is booked today or later', async () => {
    const { repository, assignments } = setup({ booked: 1 });

    await expect(
      new DeleteEquipmentHandler(repository, assignments).execute(new DeleteEquipmentCommand('eq-1')),
    ).rejects.toBeInstanceOf(EquipmentStillAssignedException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('answers not-found for an unknown or already deleted machine', async () => {
    const { repository, assignments } = setup({ found: null });

    await expect(
      new DeleteEquipmentHandler(repository, assignments).execute(new DeleteEquipmentCommand('eq-1')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('equipment queries', () => {
  it('hands the search through', async () => {
    const { repository } = setup();
    const params = { filters: { status: EquipmentStatus.IN_SERVICE } };

    await new GetEquipmentListHandler(repository).execute(new GetEquipmentListQuery(params));

    expect(repository.search).toHaveBeenCalledWith(params);
  });

  it('reads one, and answers not-found for a foreign id', async () => {
    await expect(
      new GetEquipmentByIdHandler(setup().repository).execute(new GetEquipmentByIdQuery('eq-1')),
    ).resolves.toBeInstanceOf(Equipment);
    await expect(
      new GetEquipmentByIdHandler(setup({ found: null }).repository).execute(
        new GetEquipmentByIdQuery('x'),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('serves the catalog as the database lists it', async () => {
    const { catalog } = setup();

    const categories = await new GetEquipmentCatalogHandler(catalog).execute();

    expect(categories[0].code).toBe('compaction');
  });
});
