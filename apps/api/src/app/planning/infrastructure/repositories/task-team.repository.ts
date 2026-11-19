import { Inject, Injectable } from '@nestjs/common';
import { ITaskTeam, ITaskWorker, PayMode, PlanNodeLevel } from '@chantia/shared';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { TaskTeamPort } from '../../domain/ports/task-team.port';

const day = (value: Date): string => value.toISOString().slice(0, 10);

const WITH_WORKER = { worker: { select: { name: true, qualification: true } } } as const;

function toTaskWorker(row: {
  id: string;
  worksiteTaskId: string;
  workerId: string;
  payMode: string;
  rate: bigint;
  worker: { name: string; qualification: string | null };
}): ITaskWorker {
  return {
    id: row.id,
    taskId: row.worksiteTaskId,
    workerId: row.workerId,
    workerName: row.worker.name,
    qualification: row.worker.qualification,
    payMode: row.payMode as PayMode,
    rate: Number(row.rate),
  };
}

@Injectable()
export class TaskTeamRepository implements TaskTeamPort {
  constructor(@Inject(TENANT_PRISMA) private readonly prisma: TenantPrismaClient) {}

  async findTask(id: string): Promise<{ worksiteId: string; level: PlanNodeLevel } | null> {
    const row = await this.prisma.worksiteTask.findFirst({
      where: { id },
      select: { worksiteId: true, level: true },
    });
    return row ? { worksiteId: row.worksiteId, level: row.level as PlanNodeLevel } : null;
  }

  async findActiveWorker(id: string): Promise<{ hourlyRate: number } | null> {
    const row = await this.prisma.worker.findFirst({
      where: { id, active: true, deletedAt: null },
      select: { hourlyRate: true },
    });
    return row ? { hourlyRate: Number(row.hourlyRate) } : null;
  }

  async findTeam(worksiteId: string): Promise<ITaskTeam> {
    const [workers, equipment] = await Promise.all([
      this.prisma.taskWorker.findMany({
        where: { task: { worksiteId } },
        include: WITH_WORKER,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.taskEquipment.findMany({
        where: { task: { worksiteId } },
        include: {
          assignment: {
            select: {
              startDate: true,
              endDate: true,
              equipment: { select: { designation: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      workers: workers.map(toTaskWorker),
      equipment: equipment.map((row) => ({
        id: row.id,
        taskId: row.worksiteTaskId,
        equipmentAssignmentId: row.equipmentAssignmentId,
        designation: row.assignment.equipment.designation,
        startDate: day(row.assignment.startDate),
        endDate: day(row.assignment.endDate),
      })),
    };
  }

  async isWorkerOnTask(taskId: string, workerId: string): Promise<boolean> {
    return (
      (await this.prisma.taskWorker.count({ where: { worksiteTaskId: taskId, workerId } })) > 0
    );
  }

  async addWorker(row: {
    organizationId: string;
    taskId: string;
    workerId: string;
    payMode: PayMode;
    rate: number;
  }): Promise<ITaskWorker> {
    const created = await this.prisma.taskWorker.create({
      data: {
        organizationId: row.organizationId,
        worksiteTaskId: row.taskId,
        workerId: row.workerId,
        payMode: row.payMode,
        rate: row.rate,
      },
      include: WITH_WORKER,
    });
    return toTaskWorker(created);
  }

  async removeWorker(id: string): Promise<boolean> {
    return (await this.prisma.taskWorker.deleteMany({ where: { id } })).count > 0;
  }

  async findEquipmentAssignment(id: string): Promise<{ worksiteId: string } | null> {
    return this.prisma.equipmentAssignment.findFirst({
      where: { id },
      select: { worksiteId: true },
    });
  }

  async isEquipmentOnTask(taskId: string, equipmentAssignmentId: string): Promise<boolean> {
    return (
      (await this.prisma.taskEquipment.count({
        where: { worksiteTaskId: taskId, equipmentAssignmentId },
      })) > 0
    );
  }

  async linkEquipment(
    organizationId: string,
    taskId: string,
    equipmentAssignmentId: string,
  ): Promise<void> {
    await this.prisma.taskEquipment.create({
      data: { organizationId, worksiteTaskId: taskId, equipmentAssignmentId },
    });
  }

  async unlinkEquipment(id: string): Promise<boolean> {
    return (await this.prisma.taskEquipment.deleteMany({ where: { id } })).count > 0;
  }
}
