import { Inject, Injectable } from '@nestjs/common';
import { IWorksiteMember, IWorksiteTask, PlanNodeLevel, WorksiteStatus } from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { treeOf } from '../../domain/plan-tree';
import { WorksiteTeamPort, WorksiteWithPlan } from '../../domain/ports/worksite-team.port';

const day = (value: Date | null): string | null => value?.toISOString().slice(0, 10) ?? null;

/** Far more than any person works on at once; only here so a list stays bounded. */
const MAX_VISIBLE = 200;

@Injectable()
export class WorksiteTeamRepository implements WorksiteTeamPort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async isMember(worksiteId: string, userId: string): Promise<boolean> {
    return (await this.prisma.worksiteMember.count({ where: { worksiteId, userId } })) > 0;
  }

  async listMembers(worksiteId: string): Promise<IWorksiteMember[]> {
    const members = await this.prisma.worksiteMember.findMany({ where: { worksiteId } });
    // Read across contexts on purpose, and only names: identity owns accounts.
    const users = await this.prisma.user.findMany({
      where: { id: { in: members.map((member) => member.userId) } },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map((user) => ({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }));
  }

  async findActiveUserIds(userIds: string[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, active: true },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  async replaceMembers(
    organizationId: string,
    worksiteId: string,
    userIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.worksiteMember.deleteMany({ where: { worksiteId } });
      await tx.worksiteMember.createMany({
        data: userIds.map((userId) => ({ organizationId, worksiteId, userId })),
      });
    });
  }

  async findVisible(options: { memberOf?: string; id?: string }): Promise<WorksiteWithPlan[]> {
    const rows = await this.prisma.worksite.findMany({
      where: {
        deletedAt: null,
        ...(options.id ? { id: options.id } : { status: WorksiteStatus.IN_PROGRESS }),
        ...(options.memberOf ? { members: { some: { userId: options.memberOf } } } : {}),
      },
      orderBy: { name: 'asc' },
      take: MAX_VISIBLE,
      include: {
        client: { select: { displayName: true } },
        worksiteTasks: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { members: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      client: row.client?.displayName ?? null,
      plannedStartDate: day(row.plannedStartDate),
      plannedEndDate: day(row.plannedEndDate),
      memberCount: row._count.members,
      tasks: treeOf<(typeof row.worksiteTasks)[number], IWorksiteTask>(
        row.worksiteTasks,
        (task) => task.id,
        (task) => task.parentId,
        (task, children) => ({
          id: task.id,
          level: task.level as PlanNodeLevel,
          label: task.label,
          isControl: task.isControl,
          plannedStart: day(task.plannedStart),
          plannedEnd: day(task.plannedEnd),
          progress: task.progress,
          children,
        }),
      ),
    }));
  }
}
