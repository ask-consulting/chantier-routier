import { Inject, Injectable } from '@nestjs/common';
import { IEquipmentCategory } from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { EquipmentTypeDefaults } from '../../domain/entities/equipment.entity';
import { EquipmentCatalogPort } from '../../domain/ports/equipment-catalog.port';

/**
 * Reads the catalog tables. They carry no `organizationId`, so the tenant
 * extension leaves these queries untouched — the catalog is the same for all.
 */
@Injectable()
export class EquipmentCatalogRepository implements EquipmentCatalogPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async findType(code: string): Promise<EquipmentTypeDefaults | null> {
    const row = await this.prisma.equipmentType.findUnique({
      where: { code },
      select: { defaultUsefulLifeMonths: true },
    });
    return row ? { defaultUsefulLifeMonths: row.defaultUsefulLifeMonths } : null;
  }

  async listCategories(): Promise<IEquipmentCategory[]> {
    const rows = await this.prisma.equipmentCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { types: { orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] } },
    });
    return rows.map((category) => ({
      code: category.code,
      labelFr: category.labelFr,
      labelAr: category.labelAr,
      types: category.types.map((type) => ({
        code: type.code,
        categoryCode: type.categoryCode,
        defaultUsefulLifeMonths: type.defaultUsefulLifeMonths,
        labelFr: type.labelFr,
        labelAr: type.labelAr,
      })),
    }));
  }
}
