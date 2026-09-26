import { describe, expect, it, vi } from 'vitest';
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
import { GetEquipmentListHandler } from './queries/get-equipment-list.handler';
import { GetEquipmentListQuery } from './queries/get-equipment-list.query';
import { Equipment } from '../domain/entities/equipment.entity';
import { InvalidEquipmentException } from '../domain/exceptions/equipment.exceptions';
import { EquipmentRepositoryPort } from '../domain/ports/equipment-repository.port';

function existing(): Equipment {
  return Equipment.create({
    id: 'eq-1',
    organizationId: 'org-1',
    typeCode: 'motor_grader',
    designation: 'Niveleuse 140K',
    acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
    acquisitionDate: '2025-03-01',
    purchasePrice: 420_000,
  });
}

function setup(found: Equipment | null = existing()) {
  const saved: Equipment[] = [];
  const repository = {
    search: vi.fn(async () => ({ items: [existing()], total: 1, page: 1, limit: 20 })),
    findById: vi.fn(async () => found),
    save: vi.fn(async (equipment: Equipment) => {
      saved.push(equipment);
      return equipment;
    }),
  } satisfies EquipmentRepositoryPort;
  return { repository, saved };
}

describe('CreateEquipmentHandler', () => {
  it('adds a machine under the caller’s organization, with a fresh id', async () => {
    const { repository, saved } = setup();

    await new CreateEquipmentHandler(repository).execute(
      new CreateEquipmentCommand('org-1', {
        typeCode: 'tandem_roller',
        designation: 'Compacteur tandem',
        acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
        acquisitionDate: '2026-09-01',
        dailyRate: 450,
      }),
    );

    expect(saved[0].organizationId).toBe('org-1');
    expect(saved[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved[0].dailyCostOn('2026-09-02')).toBe(450);
  });

  it('refuses before saving when the fields do not hold together', async () => {
    const { repository } = setup();

    await expect(
      new CreateEquipmentHandler(repository).execute(
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
    const { repository, saved } = setup();

    await new UpdateEquipmentHandler(repository).execute(
      new UpdateEquipmentCommand('eq-1', {
        status: EquipmentStatus.RETIRED,
        disposalDate: '2026-09-01',
      }),
    );

    expect(saved[0].status).toBe(EquipmentStatus.RETIRED);
    expect(saved[0].dailyCostOn('2026-09-02')).toBe(0);
  });

  it('answers not-found for an unknown or foreign machine', async () => {
    const { repository } = setup(null);

    await expect(
      new UpdateEquipmentHandler(repository).execute(new UpdateEquipmentCommand('nope', {})),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('DeleteEquipmentHandler', () => {
  it('sets deletedAt — never a real delete', async () => {
    const { repository, saved } = setup();

    await new DeleteEquipmentHandler(repository).execute(new DeleteEquipmentCommand('eq-1'));

    expect(saved[0].isDeleted()).toBe(true);
    expect(repository).not.toHaveProperty('delete');
  });

  it('answers not-found for an unknown or already deleted machine', async () => {
    const { repository } = setup(null);

    await expect(
      new DeleteEquipmentHandler(repository).execute(new DeleteEquipmentCommand('eq-1')),
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
      new GetEquipmentByIdHandler(setup(null).repository).execute(new GetEquipmentByIdQuery('x')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
