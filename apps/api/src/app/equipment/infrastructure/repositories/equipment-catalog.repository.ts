import { Inject, Injectable } from '@nestjs/common';
import { IEquipmentCategory, Translations } from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { EquipmentTypeDefaults } from '../../domain/entities/equipment.entity';
import { EquipmentCatalogPort } from '../../domain/ports/equipment-catalog.port';

/** Every translation row of an entry, as `{ locale: label }`. */
function labelsOf(rows: readonly { locale: string; label: string }[]): Translations {
  return Object.fromEntries(rows.map((row) => [row.locale, row.label]));
}

const TRANSLATIONS = { select: { locale: true, label: true } } as const;

/**
 * Reads the catalog tables. They carry no `organizationId`, so the tenant
 * extension leaves these queries untouched — the catalog is the same for all.
 *
 * Every language comes back, not only the caller's: the catalog is cached by
 * the client for the session, and switching language must not refetch it.
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
      include: {
        translations: TRANSLATIONS,
        types: {
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          include: { translations: TRANSLATIONS },
        },
      },
    });
    return rows.map((category) => ({
      code: category.code,
      labels: labelsOf(category.translations),
      types: category.types.map((type) => ({
        code: type.code,
        categoryCode: type.categoryCode,
        defaultUsefulLifeMonths: type.defaultUsefulLifeMonths,
        labels: labelsOf(type.translations),
      })),
    }));
  }
}
