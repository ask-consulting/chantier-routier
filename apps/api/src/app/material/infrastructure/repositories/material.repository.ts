import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IMaterialCategory, IOwnMaterial, MaterialUnit, Translations } from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { MaterialLabelTakenException } from '../../domain/exceptions/material.exceptions';
import { MaterialPort } from '../../domain/ports/material.port';

/** Every translation row of an entry, as `{ locale: label }`. */
export function labelsOf(rows: readonly { locale: string; label: string }[]): Translations {
  return Object.fromEntries(rows.map((row) => [row.locale, row.label]));
}

const TRANSLATIONS = { select: { locale: true, label: true } } as const;
const OWN = { id: true, categoryId: true, label: true, unit: true } as const;
const LIVE = { deletedAt: null } as const;

/**
 * The only unique index of `materials` besides its key is the live label: a
 * P2002 is two writes racing past `isLabelTaken`.
 */
async function labelGuarded<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new MaterialLabelTakenException();
    }
    throw error;
  }
}

const toOwn = (row: { id: string; categoryId: string; label: string; unit: string }) => ({
  ...row,
  unit: row.unit as MaterialUnit,
});

/**
 * The catalog tables carry no `organizationId`, so the tenant extension leaves
 * them untouched; `materials` carries one, so every query on it is the caller's.
 */
@Injectable()
export class MaterialRepository implements MaterialPort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async listCatalog(): Promise<IMaterialCategory[]> {
    const rows = await this.prisma.materialCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: TRANSLATIONS,
        materials: {
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          include: { translations: TRANSLATIONS },
        },
      },
    });
    return rows.map((category) => ({
      id: category.id,
      code: category.code,
      labels: labelsOf(category.translations),
      materials: category.materials.map((material) => ({
        id: material.id,
        code: material.code,
        categoryId: material.categoryId,
        unit: material.unit as MaterialUnit,
        labels: labelsOf(material.translations),
      })),
    }));
  }

  async categoryExists(id: string): Promise<boolean> {
    return (await this.prisma.materialCategory.count({ where: { id } })) > 0;
  }

  async listOwn(): Promise<IOwnMaterial[]> {
    const rows = await this.prisma.material.findMany({
      where: LIVE,
      select: OWN,
      orderBy: { label: 'asc' },
    });
    return rows.map(toOwn);
  }

  async findOwn(id: string): Promise<IOwnMaterial | null> {
    const row = await this.prisma.material.findFirst({ where: { id, ...LIVE }, select: OWN });
    return row ? toOwn(row) : null;
  }

  async isLabelTaken(label: string, exceptId?: string): Promise<boolean> {
    const count = await this.prisma.material.count({
      where: {
        ...LIVE,
        label: { equals: label, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  }

  async isInUse(id: string): Promise<boolean> {
    return (await this.prisma.taskMaterial.count({ where: { materialId: id } })) > 0;
  }

  async createOwn(organizationId: string, data: Omit<IOwnMaterial, 'id'>): Promise<IOwnMaterial> {
    return toOwn(
      await labelGuarded(
        this.prisma.material.create({ data: { organizationId, ...data }, select: OWN }),
      ),
    );
  }

  async updateOwn(
    id: string,
    data: Partial<{ categoryId: string; label: string; unit: MaterialUnit }>,
  ): Promise<IOwnMaterial> {
    return toOwn(
      await labelGuarded(this.prisma.material.update({ where: { id }, data, select: OWN })),
    );
  }

  async removeOwn(id: string): Promise<void> {
    await this.prisma.material.updateMany({ where: { id, ...LIVE }, data: { deletedAt: new Date() } });
  }
}
