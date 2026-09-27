import { describe, expect, it, vi } from 'vitest';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { EquipmentCatalogRepository } from './equipment-catalog.repository';

function setup(type: { defaultUsefulLifeMonths: number } | null = { defaultUsefulLifeMonths: 60 }) {
  const prisma = {
    equipmentType: { findUnique: vi.fn(async () => type) },
    equipmentCategory: {
      findMany: vi.fn(async () => [
        {
          code: 'compaction',
          sortOrder: 20,
          translations: [
            { locale: 'fr', label: 'Compactage' },
            { locale: 'ar', label: 'الدمك' },
            // A language the product does not speak yet — served all the same.
            { locale: 'en', label: 'Compaction' },
          ],
          types: [
            {
              code: 'tandem_roller',
              categoryCode: 'compaction',
              defaultUsefulLifeMonths: 60,
              sortOrder: 20,
              translations: [{ locale: 'fr', label: 'Compacteur tandem' }],
            },
          ],
        },
      ]),
    },
  };
  return { prisma, repository: new EquipmentCatalogRepository(prisma as unknown as TenantPrismaClient) };
}

describe('EquipmentCatalogRepository', () => {
  it('reads a type’s defaults, or null for an unknown code', async () => {
    expect(await setup().repository.findType('tandem_roller')).toEqual({ defaultUsefulLifeMonths: 60 });
    expect(await setup(null).repository.findType('spaceship')).toBeNull();
  });

  it('lists categories and types in display order, every language as a map', async () => {
    const { repository, prisma } = setup();

    const [category] = await repository.listCategories();

    expect(prisma.equipmentCategory.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: { select: { locale: true, label: true } },
        types: {
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          include: { translations: { select: { locale: true, label: true } } },
        },
      },
    });
    expect(category).toEqual({
      code: 'compaction',
      labels: { fr: 'Compactage', ar: 'الدمك', en: 'Compaction' },
      types: [
        {
          code: 'tandem_roller',
          categoryCode: 'compaction',
          defaultUsefulLifeMonths: 60,
          // Only French so far: the client falls back to it — see `translated`.
          labels: { fr: 'Compacteur tandem' },
        },
      ],
    });
  });
});
