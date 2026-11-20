import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ITaskMaterial,
  MaterialUnit,
  PlanNodeLevel,
  plannedMaterialCost,
} from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { MaterialRef, TaskMaterialsPort } from '../../domain/ports/task-materials.port';

const WITH_MATERIAL = {
  catalogMaterial: {
    select: { unit: true, translations: { select: { locale: true, label: true } } },
  },
  material: { select: { label: true, unit: true } },
} as const;

type Row = Prisma.TaskMaterialGetPayload<{ include: typeof WITH_MATERIAL }>;

/** The row with the material it points at — exactly one of the two, by constraint. */
function toTaskMaterial(row: Row): ITaskMaterial {
  const quantity = row.quantity.toNumber();
  const unitPrice = row.unitPrice === null ? null : Number(row.unitPrice);
  const catalog = row.catalogMaterial;
  return {
    id: row.id,
    taskId: row.worksiteTaskId,
    materialId: (row.catalogMaterialId ?? row.materialId) as string,
    labels: catalog
      ? Object.fromEntries(catalog.translations.map((t) => [t.locale, t.label]))
      : {},
    label: row.material?.label ?? null,
    unit: (catalog?.unit ?? row.material?.unit) as MaterialUnit,
    quantity,
    unitPrice,
    plannedCost: plannedMaterialCost(quantity, unitPrice),
  };
}

const columnsOf = (material: MaterialRef) =>
  'catalogMaterialId' in material
    ? { catalogMaterialId: material.catalogMaterialId }
    : { materialId: material.materialId };

@Injectable()
export class TaskMaterialsRepository implements TaskMaterialsPort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async findTask(id: string): Promise<{ worksiteId: string; level: PlanNodeLevel } | null> {
    const row = await this.prisma.worksiteTask.findFirst({
      where: { id },
      select: { worksiteId: true, level: true },
    });
    return row ? { worksiteId: row.worksiteId, level: row.level as PlanNodeLevel } : null;
  }

  async resolveMaterial(id: string): Promise<MaterialRef | null> {
    // The catalog first: it is global, so the tenant filter leaves it alone.
    if ((await this.prisma.catalogMaterial.count({ where: { id } })) > 0) {
      return { catalogMaterialId: id };
    }
    const own = await this.prisma.material.count({ where: { id, deletedAt: null } });
    return own > 0 ? { materialId: id } : null;
  }

  async findForWorksite(worksiteId: string): Promise<ITaskMaterial[]> {
    const rows = await this.prisma.taskMaterial.findMany({
      where: { task: { worksiteId } },
      include: WITH_MATERIAL,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toTaskMaterial);
  }

  async isPlanned(taskId: string, material: MaterialRef): Promise<boolean> {
    const count = await this.prisma.taskMaterial.count({
      where: { worksiteTaskId: taskId, ...columnsOf(material) },
    });
    return count > 0;
  }

  async add(row: {
    organizationId: string;
    taskId: string;
    material: MaterialRef;
    quantity: number;
    unitPrice: number | null;
  }): Promise<ITaskMaterial> {
    const created = await this.prisma.taskMaterial.create({
      data: {
        organizationId: row.organizationId,
        worksiteTaskId: row.taskId,
        ...columnsOf(row.material),
        quantity: row.quantity,
        unitPrice: row.unitPrice,
      },
      include: WITH_MATERIAL,
    });
    return toTaskMaterial(created);
  }

  async update(
    id: string,
    data: { quantity?: number; unitPrice?: number | null },
  ): Promise<ITaskMaterial | null> {
    // `updateMany`: another tenant's row is then found nowhere, where `update` would throw.
    const { count } = await this.prisma.taskMaterial.updateMany({ where: { id }, data });
    if (count === 0) {
      return null;
    }
    const row = await this.prisma.taskMaterial.findFirst({ where: { id }, include: WITH_MATERIAL });
    return row ? toTaskMaterial(row) : null;
  }

  async remove(id: string): Promise<boolean> {
    return (await this.prisma.taskMaterial.deleteMany({ where: { id } })).count > 0;
  }
}
