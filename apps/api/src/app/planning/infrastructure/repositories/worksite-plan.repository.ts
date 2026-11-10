import { Inject, Injectable } from '@nestjs/common';
import { IWorksiteTask, PlanNodeLevel } from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { NewTask, treeOf } from '../../domain/plan-tree';
import {
  WorksitePeriod,
  WorksitePlanRepositoryPort,
} from '../../domain/ports/worksite-plan-repository.port';

const day = (value: Date | null): string | null => value?.toISOString().slice(0, 10) ?? null;
const date = (value: string | null): Date | null =>
  value === null ? null : new Date(`${value}T00:00:00.000Z`);

@Injectable()
export class WorksitePlanRepository implements WorksitePlanRepositoryPort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async findPeriod(worksiteId: string): Promise<WorksitePeriod | null> {
    const row = await this.prisma.worksite.findFirst({
      where: { id: worksiteId, deletedAt: null },
      select: { plannedStartDate: true, plannedEndDate: true },
    });
    return row ? { start: day(row.plannedStartDate), end: day(row.plannedEndDate) } : null;
  }

  async findTree(worksiteId: string): Promise<IWorksiteTask[]> {
    const rows = await this.prisma.worksiteTask.findMany({
      where: { worksiteId },
      orderBy: { sortOrder: 'asc' },
    });
    return treeOf<(typeof rows)[number], IWorksiteTask>(
      rows,
      (row) => row.id,
      (row) => row.parentId,
      (row, children) => ({
        id: row.id,
        level: row.level as PlanNodeLevel,
        label: row.label,
        isControl: row.isControl,
        plannedStart: day(row.plannedStart),
        plannedEnd: day(row.plannedEnd),
        progress: row.progress,
        children,
      }),
    );
  }

  async createIfEmpty(
    organizationId: string,
    worksiteId: string,
    tasks: NewTask[],
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Locks the worksite so that two clicks cannot both find it empty. The
      // caller's right to it was checked through the tenant filter just before.
      await tx.$queryRaw`SELECT 1 FROM "public"."worksites" WHERE "id" = ${worksiteId}::uuid FOR UPDATE`;
      if ((await tx.worksiteTask.count({ where: { worksiteId } })) > 0) {
        return false;
      }
      await tx.worksiteTask.createMany({
        data: tasks.map((task) => ({
          ...task,
          organizationId,
          worksiteId,
          plannedStart: date(task.plannedStart),
          plannedEnd: date(task.plannedEnd),
        })),
      });
      return true;
    });
  }

  async deleteAll(worksiteId: string): Promise<void> {
    await this.prisma.worksiteTask.deleteMany({ where: { worksiteId } });
  }

  async findTaskShape(id: string): Promise<{ hasChildren: boolean; worksiteId: string } | null> {
    const row = await this.prisma.worksiteTask.findFirst({
      where: { id },
      select: { worksiteId: true, _count: { select: { children: true } } },
    });
    return row ? { hasChildren: row._count.children > 0, worksiteId: row.worksiteId } : null;
  }

  async updateDates(id: string, plannedStart: string, plannedEnd: string): Promise<void> {
    await this.prisma.worksiteTask.updateMany({
      where: { id },
      data: { plannedStart: date(plannedStart), plannedEnd: date(plannedEnd) },
    });
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.prisma.worksiteTask.updateMany({ where: { id }, data: { progress } });
  }
}
