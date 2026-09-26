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
          labelFr: 'Compactage',
          labelAr: 'الدمك',
          sortOrder: 20,
          types: [
            {
              code: 'tandem_roller',
              categoryCode: 'compaction',
              defaultUsefulLifeMonths: 60,
              labelFr: 'Compacteur tandem',
              labelAr: 'مدحلة ترادفية',
              sortOrder: 20,
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

  it('lists categories and types in display order, without the sort keys', async () => {
    const { repository, prisma } = setup();

    const [category] = await repository.listCategories();

    expect(prisma.equipmentCategory.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: 'asc' },
      include: { types: { orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] } },
    });
    expect(category).toEqual({
      code: 'compaction',
      labelFr: 'Compactage',
      labelAr: 'الدمك',
      types: [
        {
          code: 'tandem_roller',
          categoryCode: 'compaction',
          defaultUsefulLifeMonths: 60,
          labelFr: 'Compacteur tandem',
          labelAr: 'مدحلة ترادفية',
        },
      ],
    });
  });
});
