import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialUnit } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  MaterialLabelTakenException,
  MaterialUnitInUseException,
  UnknownMaterialCategoryException,
} from '../domain/exceptions/material.exceptions';
import {
  CreateOwnMaterialHandler,
  GetMaterialCatalogHandler,
  GetOwnMaterialsHandler,
  RemoveOwnMaterialHandler,
  UpdateOwnMaterialHandler,
} from './material.handlers';
import {
  CreateOwnMaterialCommand,
  RemoveOwnMaterialCommand,
  UpdateOwnMaterialCommand,
} from './material.messages';

const materials = {
  listCatalog: vi.fn(),
  categoryExists: vi.fn(),
  listOwn: vi.fn(),
  findOwn: vi.fn(),
  isLabelTaken: vi.fn(),
  isInUse: vi.fn(),
  createOwn: vi.fn(),
  updateOwn: vi.fn(),
  removeOwn: vi.fn(),
};
const SAND = { id: 'm', categoryId: 'c', label: 'Sable de oued', unit: MaterialUnit.CUBIC_METRE };

beforeEach(() => {
  vi.resetAllMocks();
  materials.categoryExists.mockResolvedValue(true);
  materials.isLabelTaken.mockResolvedValue(false);
  materials.isInUse.mockResolvedValue(false);
  materials.findOwn.mockResolvedValue(SAND);
  materials.createOwn.mockImplementation(async (_org, data) => ({ id: 'm', ...data }));
  materials.updateOwn.mockImplementation(async (id, data) => ({ ...SAND, id, ...data }));
});

describe('reading materials', () => {
  it('passes the catalog and the own materials through', async () => {
    materials.listCatalog.mockResolvedValue(['catalog']);
    materials.listOwn.mockResolvedValue([SAND]);

    await expect(new GetMaterialCatalogHandler(materials).execute()).resolves.toEqual(['catalog']);
    await expect(new GetOwnMaterialsHandler(materials).execute()).resolves.toEqual([SAND]);
  });
});

describe('adding an own material', () => {
  const create = new CreateOwnMaterialHandler(materials);
  const run = (data: object = {}) =>
    create.execute(
      new CreateOwnMaterialCommand('org', {
        categoryId: 'c',
        label: '  Sable de oued ',
        unit: MaterialUnit.CUBIC_METRE,
        ...data,
      }),
    );

  it('stores it trimmed, for the caller’s organization', async () => {
    await expect(run()).resolves.toEqual(SAND);
    expect(materials.createOwn).toHaveBeenCalledWith('org', {
      categoryId: 'c',
      label: 'Sable de oued',
      unit: MaterialUnit.CUBIC_METRE,
    });
    expect(materials.isLabelTaken).toHaveBeenCalledWith('Sable de oued');
  });

  it('refuses an unknown category', async () => {
    materials.categoryExists.mockResolvedValue(false);
    await expect(run()).rejects.toBeInstanceOf(UnknownMaterialCategoryException);
    expect(materials.createOwn).not.toHaveBeenCalled();
  });

  it('refuses a name already taken', async () => {
    materials.isLabelTaken.mockResolvedValue(true);
    await expect(run()).rejects.toBeInstanceOf(MaterialLabelTakenException);
  });
});

describe('changing an own material', () => {
  const update = new UpdateOwnMaterialHandler(materials);
  const run = (data: object) => update.execute(new UpdateOwnMaterialCommand('m', data));

  it('renames it, its own name aside from the check', async () => {
    await run({ label: ' Sable lavé ' });
    expect(materials.isLabelTaken).toHaveBeenCalledWith('Sable lavé', 'm');
    expect(materials.updateOwn).toHaveBeenCalledWith('m', { label: 'Sable lavé' });
  });

  it('changes nothing it was not given', async () => {
    await run({});
    expect(materials.updateOwn).toHaveBeenCalledWith('m', {});
    expect(materials.isLabelTaken).not.toHaveBeenCalled();
  });

  it('refiles it under a known category only', async () => {
    await run({ categoryId: 'd' });
    expect(materials.updateOwn).toHaveBeenCalledWith('m', { categoryId: 'd' });

    materials.categoryExists.mockResolvedValue(false);
    await expect(run({ categoryId: 'x' })).rejects.toBeInstanceOf(
      UnknownMaterialCategoryException,
    );
  });

  it('refuses a name already taken', async () => {
    materials.isLabelTaken.mockResolvedValue(true);
    await expect(run({ label: 'Gravier' })).rejects.toBeInstanceOf(MaterialLabelTakenException);
  });

  it('changes the unit while no task counts in it', async () => {
    await run({ unit: MaterialUnit.TONNE });
    expect(materials.updateOwn).toHaveBeenCalledWith('m', { unit: MaterialUnit.TONNE });
  });

  it('keeps the unit a task already counts in', async () => {
    materials.isInUse.mockResolvedValue(true);
    await expect(run({ unit: MaterialUnit.TONNE })).rejects.toBeInstanceOf(
      MaterialUnitInUseException,
    );
    // The same unit again is no change.
    await expect(run({ unit: MaterialUnit.CUBIC_METRE })).resolves.toBeDefined();
  });

  it('does not find another organization’s material', async () => {
    materials.findOwn.mockResolvedValue(null);
    await expect(run({ label: 'x' })).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('removing an own material', () => {
  const remove = new RemoveOwnMaterialHandler(materials);

  it('removes one of the caller’s', async () => {
    await remove.execute(new RemoveOwnMaterialCommand('m'));
    expect(materials.removeOwn).toHaveBeenCalledWith('m');
  });

  it('does not find another organization’s', async () => {
    materials.findOwn.mockResolvedValue(null);
    await expect(remove.execute(new RemoveOwnMaterialCommand('x'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(materials.removeOwn).not.toHaveBeenCalled();
  });
});
