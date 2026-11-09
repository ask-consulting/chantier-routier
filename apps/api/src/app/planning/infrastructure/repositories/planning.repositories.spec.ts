import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanNodeLevel } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { NewTask } from '../../domain/plan-tree';
import { PlanSourceRepository } from './plan-source.repository';
import { WorksitePlanRepository } from './worksite-plan.repository';

describe('PlanSourceRepository', () => {
  const planTemplate = { findUnique: vi.fn() };
  const organizationPlan = { findUnique: vi.fn() };
  const repository = new PlanSourceRepository({
    planTemplate,
    organizationPlan,
  } as unknown as TenantPrismaClient);

  const row = (id: string, parentId: string | null, translations: object[]) => ({
    id,
    parentId,
    code: `code-${id}`,
    isControl: id === 'b',
    translations,
  });

  beforeEach(() => vi.resetAllMocks());

  it('takes the asked language, then French, then the code, line by line', async () => {
    planTemplate.findUnique.mockResolvedValue({
      nodes: [
        row('a', null, [
          { locale: 'fr', label: 'Fondations' },
          { locale: 'ar', label: 'الأساسات' },
        ]),
        row('b', 'a', [{ locale: 'fr', label: 'Réception' }]),
        row('c', 'a', []),
      ],
    });

    const plan = await repository.findTemplate('tpl', 'ar');

    expect(plan?.nodes[0]?.label).toBe('الأساسات');
    expect(plan?.nodes[0]?.children[0]).toMatchObject({ label: 'Réception', isControl: true });
    expect(plan?.nodes[0]?.children[1]?.label).toBe('code-c');
    expect(plan?.nodes[0]?.code).toBe('code-a');
  });

  it('reads an organization’s plan, without reference codes', async () => {
    organizationPlan.findUnique.mockResolvedValue({
      nodes: [{ id: 'p', parentId: null, label: 'Phase', isControl: false }],
    });

    const plan = await repository.findOrganizationPlan('plan-1');

    expect(plan?.nodes[0]).toEqual({ label: 'Phase', isControl: false, code: null, children: [] });
  });

  it('answers null for what does not exist', async () => {
    planTemplate.findUnique.mockResolvedValue(null);
    organizationPlan.findUnique.mockResolvedValue(null);

    await expect(repository.findTemplate('x', 'fr')).resolves.toBeNull();
    await expect(repository.findOrganizationPlan('x')).resolves.toBeNull();
  });
});

describe('WorksitePlanRepository', () => {
  const tx = { $queryRaw: vi.fn(), worksiteTask: { count: vi.fn(), createMany: vi.fn() } };
  const worksite = { findFirst: vi.fn() };
  const worksiteTask = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  };
  const repository = new WorksitePlanRepository({
    worksite,
    worksiteTask,
    $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
  } as unknown as TenantPrismaClient);
  const line: NewTask = {
    id: 't',
    parentId: null,
    level: PlanNodeLevel.PHASE,
    label: 'x',
    sortOrder: 1,
    isControl: false,
    sourceCode: null,
    plannedStart: '2026-01-02',
    plannedEnd: null,
  };

  beforeEach(() => vi.resetAllMocks());

  it('ignores a deleted worksite and gives days', async () => {
    worksite.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      plannedStartDate: new Date('2026-01-01T00:00:00Z'),
      plannedEndDate: null,
    });

    await expect(repository.findPeriod('x')).resolves.toBeNull();
    await expect(repository.findPeriod('ws')).resolves.toEqual({ start: '2026-01-01', end: null });
    expect(worksite.findFirst.mock.calls[0]?.[0].where).toEqual({ id: 'x', deletedAt: null });
  });

  it('rebuilds the tree', async () => {
    worksiteTask.findMany.mockResolvedValue([
      {
        id: 'p',
        parentId: null,
        level: 'phase',
        label: 'P',
        isControl: false,
        plannedStart: null,
        plannedEnd: null,
      },
      {
        id: 't',
        parentId: 'p',
        level: 'task',
        label: 'T',
        isControl: true,
        plannedStart: new Date('2026-02-01T00:00:00Z'),
        plannedEnd: new Date('2026-02-03T00:00:00Z'),
      },
    ]);

    const [phase] = await repository.findTree('ws');

    expect(phase?.children[0]).toMatchObject({
      id: 't',
      plannedStart: '2026-02-01',
      plannedEnd: '2026-02-03',
    });
  });

  it('writes the lines when the worksite has none', async () => {
    tx.worksiteTask.count.mockResolvedValue(0);

    await expect(repository.createIfEmpty('org', 'ws', [line])).resolves.toBe(true);

    const [row] = tx.worksiteTask.createMany.mock.calls[0]![0].data;
    expect(row).toMatchObject({ organizationId: 'org', worksiteId: 'ws', plannedEnd: null });
    expect(row.plannedStart).toEqual(new Date('2026-01-02T00:00:00.000Z'));
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
  });

  it('writes nothing over an existing planning', async () => {
    tx.worksiteTask.count.mockResolvedValue(3);

    await expect(repository.createIfEmpty('org', 'ws', [line])).resolves.toBe(false);
    expect(tx.worksiteTask.createMany).not.toHaveBeenCalled();
  });

  it('knows whether a line has lines under it', async () => {
    worksiteTask.findFirst
      .mockResolvedValueOnce({ _count: { children: 2 } })
      .mockResolvedValueOnce({ _count: { children: 0 } })
      .mockResolvedValueOnce(null);

    await expect(repository.findTaskShape('a')).resolves.toEqual({ hasChildren: true });
    await expect(repository.findTaskShape('b')).resolves.toEqual({ hasChildren: false });
    await expect(repository.findTaskShape('c')).resolves.toBeNull();
  });

  it('deletes and moves by what the caller can see', async () => {
    await repository.deleteAll('ws');
    await repository.updateDates('t', '2026-01-01', '2026-01-02');

    expect(worksiteTask.deleteMany).toHaveBeenCalledWith({ where: { worksiteId: 'ws' } });
    expect(worksiteTask.updateMany.mock.calls[0]?.[0].where).toEqual({ id: 't' });
  });
});
