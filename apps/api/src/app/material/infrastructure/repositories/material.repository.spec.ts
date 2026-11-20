import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { MaterialLabelTakenException } from '../../domain/exceptions/material.exceptions';
import { MaterialRepository } from './material.repository';

const prisma = {
  materialCategory: { findMany: vi.fn(), count: vi.fn() },
  material: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  taskMaterial: { count: vi.fn() },
};
const repository = new MaterialRepository(prisma as unknown as TenantPrismaClient);
const SAND = { id: 'm', categoryId: 'c', label: 'Sable de oued', unit: 'm3' };
const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' });

beforeEach(() => vi.resetAllMocks());

describe('MaterialRepository', () => {
  it('reads the catalog with every language', async () => {
    prisma.materialCategory.findMany.mockResolvedValue([
      {
        id: 'c',
        code: 'road',
        translations: [{ locale: 'fr', label: 'Bitumes et enrobés' }],
        materials: [
          {
            id: 'z',
            code: 'bitumen',
            categoryId: 'c',
            unit: 't',
            translations: [
              { locale: 'fr', label: 'Bitume' },
              { locale: 'aeb-Latn', label: 'Zeft' },
            ],
          },
        ],
      },
    ]);

    await expect(repository.listCatalog()).resolves.toEqual([
      {
        id: 'c',
        code: 'road',
        labels: { fr: 'Bitumes et enrobés' },
        materials: [
          { id: 'z', code: 'bitumen', categoryId: 'c', unit: 't', labels: { fr: 'Bitume', 'aeb-Latn': 'Zeft' } },
        ],
      },
    ]);
  });

  it('knows a category', async () => {
    prisma.materialCategory.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(repository.categoryExists('c')).resolves.toBe(true);
    await expect(repository.categoryExists('x')).resolves.toBe(false);
  });

  it('lists and finds live own materials only', async () => {
    prisma.material.findMany.mockResolvedValue([SAND]);
    prisma.material.findFirst.mockResolvedValueOnce(SAND).mockResolvedValueOnce(null);

    await expect(repository.listOwn()).resolves.toEqual([SAND]);
    await expect(repository.findOwn('m')).resolves.toEqual(SAND);
    await expect(repository.findOwn('x')).resolves.toBeNull();
    expect(prisma.material.findMany.mock.calls[0]?.[0].where).toEqual({ deletedAt: null });
    expect(prisma.material.findFirst.mock.calls[0]?.[0].where).toEqual({ id: 'm', deletedAt: null });
  });

  it('compares names case aside, its own aside', async () => {
    prisma.material.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(repository.isLabelTaken('sable')).resolves.toBe(true);
    await expect(repository.isLabelTaken('sable', 'm')).resolves.toBe(false);
    expect(prisma.material.count.mock.calls[1]?.[0].where).toEqual({
      deletedAt: null,
      label: { equals: 'sable', mode: 'insensitive' },
      id: { not: 'm' },
    });
  });

  it('knows a material a task counts in', async () => {
    prisma.taskMaterial.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    await expect(repository.isInUse('m')).resolves.toBe(true);
    await expect(repository.isInUse('m')).resolves.toBe(false);
  });

  it('creates and updates, a racing duplicate becoming a taken name', async () => {
    prisma.material.create.mockResolvedValueOnce(SAND).mockRejectedValueOnce(duplicate());
    prisma.material.update.mockResolvedValueOnce(SAND).mockRejectedValueOnce(duplicate());
    const data = { categoryId: 'c', label: 'Sable de oued', unit: 'm3' } as never;

    await expect(repository.createOwn('org', data)).resolves.toEqual(SAND);
    expect(prisma.material.create.mock.calls[0]?.[0].data).toMatchObject({ organizationId: 'org' });
    await expect(repository.createOwn('org', data)).rejects.toBeInstanceOf(
      MaterialLabelTakenException,
    );
    await expect(repository.updateOwn('m', { label: 'x' })).resolves.toEqual(SAND);
    await expect(repository.updateOwn('m', { label: 'x' })).rejects.toBeInstanceOf(
      MaterialLabelTakenException,
    );
  });

  it('lets any other failure through', async () => {
    prisma.material.create.mockRejectedValue(new Error('down'));
    await expect(repository.createOwn('org', {} as never)).rejects.toThrow('down');
  });

  it('removes by stamping, never by deleting', async () => {
    await repository.removeOwn('m');
    expect(prisma.material.updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'm', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
