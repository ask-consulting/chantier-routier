import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { WorksiteTeamRepository } from './worksite-team.repository';

const tx = { worksiteMember: { deleteMany: vi.fn(), createMany: vi.fn() } };
const prisma = {
  worksiteMember: { count: vi.fn(), findMany: vi.fn() },
  user: { findMany: vi.fn() },
  worksite: { findMany: vi.fn() },
  $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
};
const repository = new WorksiteTeamRepository(prisma as unknown as TenantPrismaClient);

beforeEach(() => vi.resetAllMocks());

describe('WorksiteTeamRepository', () => {
  it('knows who is a member', async () => {
    prisma.worksiteMember.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(repository.isMember('ws', 'u')).resolves.toBe(true);
    await expect(repository.isMember('ws', 'v')).resolves.toBe(false);
  });

  it('names the members, and nothing more of their accounts', async () => {
    prisma.worksiteMember.findMany.mockResolvedValue([{ userId: 'u' }]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u', firstName: 'Mohamed', lastName: 'Ayari', role: 'foreman' },
    ]);

    await expect(repository.listMembers('ws')).resolves.toEqual([
      { userId: 'u', firstName: 'Mohamed', lastName: 'Ayari', role: 'foreman' },
    ]);
    expect(prisma.user.findMany.mock.calls[0]?.[0].where).toEqual({ id: { in: ['u'] } });
  });

  it('keeps only active accounts', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'a' }]);

    await expect(repository.findActiveUserIds(['a', 'b'])).resolves.toEqual(['a']);
    expect(prisma.user.findMany.mock.calls[0]?.[0].where).toEqual({
      id: { in: ['a', 'b'] },
      active: true,
    });
  });

  it('replaces the members in one transaction', async () => {
    await repository.replaceMembers('org', 'ws', ['a']);

    expect(tx.worksiteMember.deleteMany).toHaveBeenCalledWith({ where: { worksiteId: 'ws' } });
    expect(tx.worksiteMember.createMany).toHaveBeenCalledWith({
      data: [{ organizationId: 'org', worksiteId: 'ws', userId: 'a' }],
    });
  });

  it('filters by membership, and by status unless one worksite is named', async () => {
    prisma.worksite.findMany.mockResolvedValue([]);

    await repository.findVisible({ memberOf: 'u' });
    await repository.findVisible({ id: 'ws' });

    expect(prisma.worksite.findMany.mock.calls[0]?.[0].where).toEqual({
      deletedAt: null,
      status: 'in_progress',
      members: { some: { userId: 'u' } },
    });
    expect(prisma.worksite.findMany.mock.calls[1]?.[0].where).toEqual({
      deletedAt: null,
      id: 'ws',
    });
  });

  it('rebuilds each worksite’s planning with its progress', async () => {
    prisma.worksite.findMany.mockResolvedValue([
      {
        id: 'ws',
        code: 'C',
        name: 'N',
        client: { displayName: 'Client' },
        plannedStartDate: new Date('2026-01-01T00:00:00Z'),
        plannedEndDate: null,
        _count: { members: 3 },
        worksiteTasks: [
          {
            id: 'p',
            parentId: null,
            level: 'phase',
            label: 'P',
            isControl: false,
            plannedStart: null,
            plannedEnd: null,
            progress: 0,
          },
          {
            id: 's',
            parentId: 'p',
            level: 'subtask',
            label: 'S',
            isControl: true,
            plannedStart: new Date('2026-01-02T00:00:00Z'),
            plannedEnd: new Date('2026-01-03T00:00:00Z'),
            progress: 40,
          },
        ],
      },
    ]);

    const [worksite] = await repository.findVisible({});

    expect(worksite).toMatchObject({
      client: 'Client',
      plannedStartDate: '2026-01-01',
      plannedEndDate: null,
      memberCount: 3,
    });
    expect(worksite?.tasks[0]?.children[0]).toMatchObject({
      progress: 40,
      plannedStart: '2026-01-02',
      isControl: true,
    });
  });
});
