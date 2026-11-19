import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { TaskMaterialsRepository } from './task-materials.repository';

const prisma = {
  worksiteTask: { findFirst: vi.fn() },
  catalogMaterial: { count: vi.fn() },
  material: { count: vi.fn() },
  taskMaterial: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
};
const repository = new TaskMaterialsRepository(prisma as unknown as TenantPrismaClient);

const catalogRow = {
  id: 'n',
  worksiteTaskId: 't',
  catalogMaterialId: 'sand',
  materialId: null,
  quantity: new Prisma.Decimal('2.5'),
  unitPrice: 33_333n,
  catalogMaterial: {
    unit: 'm3',
    translations: [
      { locale: 'fr', label: 'Sable' },
      { locale: 'aeb-Latn', label: 'Rmal' },
    ],
  },
  material: null,
};
const ownRow = {
  ...catalogRow,
  id: 'o',
  catalogMaterialId: null,
  materialId: 'own',
  unitPrice: null,
  catalogMaterial: null,
  material: { label: 'Sable de oued', unit: 't' },
};

beforeEach(() => vi.resetAllMocks());

describe('TaskMaterialsRepository', () => {
  it('reads a task', async () => {
    prisma.worksiteTask.findFirst.mockResolvedValueOnce({ worksiteId: 'ws', level: 'subtask' });
    prisma.worksiteTask.findFirst.mockResolvedValueOnce(null);

    await expect(repository.findTask('t')).resolves.toEqual({ worksiteId: 'ws', level: 'subtask' });
    await expect(repository.findTask('x')).resolves.toBeNull();
  });

  it('resolves a material in the catalog first, then among the live own ones', async () => {
    prisma.catalogMaterial.count.mockResolvedValueOnce(1).mockResolvedValue(0);
    prisma.material.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(repository.resolveMaterial('sand')).resolves.toEqual({ catalogMaterialId: 'sand' });
    await expect(repository.resolveMaterial('own')).resolves.toEqual({ materialId: 'own' });
    await expect(repository.resolveMaterial('x')).resolves.toBeNull();
    expect(prisma.material.count.mock.calls[0]?.[0].where).toEqual({ id: 'own', deletedAt: null });
  });

  it('reads the needs of a worksite, whichever kind of material', async () => {
    prisma.taskMaterial.findMany.mockResolvedValue([catalogRow, ownRow]);

    const [catalog, own] = await repository.findForWorksite('ws');

    expect(prisma.taskMaterial.findMany.mock.calls[0]?.[0].where).toEqual({
      task: { worksiteId: 'ws' },
    });
    expect(catalog).toEqual({
      id: 'n',
      taskId: 't',
      materialId: 'sand',
      labels: { fr: 'Sable', 'aeb-Latn': 'Rmal' },
      label: null,
      unit: 'm3',
      quantity: 2.5,
      unitPrice: 33_333,
      plannedCost: 83_333,
    });
    expect(own).toMatchObject({
      materialId: 'own',
      labels: {},
      label: 'Sable de oued',
      unit: 't',
      unitPrice: null,
      plannedCost: null,
    });
  });

  it('looks for a line by the right column', async () => {
    prisma.taskMaterial.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(repository.isPlanned('t', { catalogMaterialId: 'sand' })).resolves.toBe(true);
    await expect(repository.isPlanned('t', { materialId: 'own' })).resolves.toBe(false);
    expect(prisma.taskMaterial.count.mock.calls.map((call) => call[0].where)).toEqual([
      { worksiteTaskId: 't', catalogMaterialId: 'sand' },
      { worksiteTaskId: 't', materialId: 'own' },
    ]);
  });

  it('adds a line', async () => {
    prisma.taskMaterial.create.mockResolvedValue(ownRow);

    await repository.add({
      organizationId: 'org',
      taskId: 't',
      material: { materialId: 'own' },
      quantity: 2.5,
      unitPrice: null,
    });

    expect(prisma.taskMaterial.create.mock.calls[0]?.[0].data).toEqual({
      organizationId: 'org',
      worksiteTaskId: 't',
      materialId: 'own',
      quantity: 2.5,
      unitPrice: null,
    });
  });

  it('updates a line of the caller’s and reads it back, or finds nothing', async () => {
    prisma.taskMaterial.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.taskMaterial.findFirst.mockResolvedValueOnce(catalogRow);
    prisma.taskMaterial.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(repository.update('n', { quantity: 2.5 })).resolves.toMatchObject({ id: 'n' });
    await expect(repository.update('x', { quantity: 1 })).resolves.toBeNull();
    expect(prisma.taskMaterial.findFirst).toHaveBeenCalledTimes(1);
  });

  it('removes a line of the caller’s', async () => {
    prisma.taskMaterial.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(repository.remove('n')).resolves.toBe(true);
    await expect(repository.remove('x')).resolves.toBe(false);
  });
});
