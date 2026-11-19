import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PayMode } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { TaskTeamRepository } from './task-team.repository';

const prisma = {
  worksiteTask: { findFirst: vi.fn() },
  worker: { findFirst: vi.fn() },
  taskWorker: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  taskEquipment: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  equipmentAssignment: { findFirst: vi.fn() },
};
const repository = new TaskTeamRepository(prisma as unknown as TenantPrismaClient);
const workerRow = {
  id: 'a',
  worksiteTaskId: 't',
  workerId: 'w',
  payMode: 'day',
  rate: 52000n,
  worker: { name: 'Karim', qualification: 'Maçon' },
};

beforeEach(() => vi.resetAllMocks());

describe('TaskTeamRepository', () => {
  it('reads a task and an active worker, and nothing else', async () => {
    prisma.worksiteTask.findFirst
      .mockResolvedValueOnce({ worksiteId: 'ws', level: 'task' })
      .mockResolvedValueOnce(null);
    prisma.worker.findFirst
      .mockResolvedValueOnce({ hourlyRate: 6500n })
      .mockResolvedValueOnce(null);

    await expect(repository.findTask('t')).resolves.toEqual({ worksiteId: 'ws', level: 'task' });
    await expect(repository.findTask('x')).resolves.toBeNull();
    await expect(repository.findActiveWorker('w')).resolves.toEqual({ hourlyRate: 6500 });
    await expect(repository.findActiveWorker('x')).resolves.toBeNull();
    expect(prisma.worker.findFirst.mock.calls[0]?.[0].where).toEqual({
      id: 'w',
      active: true,
      deletedAt: null,
    });
  });

  it('gathers the team of a worksite through its tasks', async () => {
    prisma.taskWorker.findMany.mockResolvedValue([workerRow]);
    prisma.taskEquipment.findMany.mockResolvedValue([
      {
        id: 'l',
        worksiteTaskId: 't',
        equipmentAssignmentId: 'b',
        assignment: {
          startDate: new Date('2026-01-01T00:00:00Z'),
          endDate: new Date('2026-01-05T00:00:00Z'),
          equipment: { designation: 'Niveleuse' },
        },
      },
    ]);

    const team = await repository.findTeam('ws');

    expect(prisma.taskWorker.findMany.mock.calls[0]?.[0].where).toEqual({
      task: { worksiteId: 'ws' },
    });
    expect(team.workers[0]).toEqual({
      id: 'a',
      taskId: 't',
      workerId: 'w',
      workerName: 'Karim',
      qualification: 'Maçon',
      payMode: PayMode.DAY,
      rate: 52000,
    });
    expect(team.equipment[0]).toMatchObject({
      designation: 'Niveleuse',
      startDate: '2026-01-01',
      endDate: '2026-01-05',
    });
  });

  it('adds, counts and removes a worker', async () => {
    prisma.taskWorker.create.mockResolvedValue(workerRow);
    prisma.taskWorker.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.taskWorker.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.addWorker({
        organizationId: 'org',
        taskId: 't',
        workerId: 'w',
        payMode: PayMode.DAY,
        rate: 52000,
      }),
    ).resolves.toMatchObject({ id: 'a', rate: 52000 });
    expect(prisma.taskWorker.create.mock.calls[0]?.[0].data).toEqual({
      organizationId: 'org',
      worksiteTaskId: 't',
      workerId: 'w',
      payMode: PayMode.DAY,
      rate: 52000,
    });
    await expect(repository.isWorkerOnTask('t', 'w')).resolves.toBe(true);
    await expect(repository.isWorkerOnTask('t', 'v')).resolves.toBe(false);
    await expect(repository.removeWorker('a')).resolves.toBe(true);
    await expect(repository.removeWorker('b')).resolves.toBe(false);
  });

  it('links, counts and unlinks a machine', async () => {
    prisma.equipmentAssignment.findFirst.mockResolvedValue({ worksiteId: 'ws' });
    prisma.taskEquipment.count.mockResolvedValueOnce(0);
    prisma.taskEquipment.deleteMany.mockResolvedValueOnce({ count: 1 });

    await expect(repository.findEquipmentAssignment('b')).resolves.toEqual({ worksiteId: 'ws' });
    await expect(repository.isEquipmentOnTask('t', 'b')).resolves.toBe(false);
    await repository.linkEquipment('org', 't', 'b');
    await expect(repository.unlinkEquipment('l')).resolves.toBe(true);
    expect(prisma.taskEquipment.create.mock.calls[0]?.[0].data).toEqual({
      organizationId: 'org',
      worksiteTaskId: 't',
      equipmentAssignmentId: 'b',
    });
  });
});
