import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanNodeLevel, WorksiteKind } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { buildPlanNodes, OrganizationPlan } from '../../domain/entities/organization-plan.entity';
import { OrganizationPlanRepository } from './organization-plan.repository';
import { PlanTemplateCatalogRepository } from './plan-template-catalog.repository';

const stamp = new Date('2026-11-09T10:00:00Z');
const planRow = {
  id: 'plan-1',
  organizationId: 'org-1',
  sourceTemplateId: null,
  name: 'Plan',
  kind: 'building',
  createdAt: stamp,
  updatedAt: stamp,
};

describe('PlanTemplateCatalogRepository', () => {
  const planTemplate = { findMany: vi.fn(), findUnique: vi.fn() };
  const repository = new PlanTemplateCatalogRepository({
    planTemplate,
  } as unknown as TenantPrismaClient);

  beforeEach(() => vi.resetAllMocks());

  it('lists with labels by language and the number of lines', async () => {
    planTemplate.findMany.mockResolvedValue([
      {
        id: 'villa',
        kind: 'building',
        translations: [{ locale: 'fr', label: 'Villa' }],
        _count: { nodes: 3 },
      },
    ]);

    await expect(repository.list()).resolves.toEqual([
      {
        id: 'villa',
        kind: 'building',
        labels: { fr: 'Villa' },
        nodeCount: 3,
      },
    ]);
  });

  it('rebuilds the tree in the order received', async () => {
    const node = (id: string, parentId: string | null, level: string) => ({
      id,
      parentId,
      level,
      isControl: false,
      translations: [{ locale: 'fr', label: id }],
    });
    planTemplate.findUnique.mockResolvedValue({
      id: 'villa',
      kind: 'building',
      translations: [],
      nodes: [node('a', null, 'phase'), node('a.1', 'a', 'task'), node('b', null, 'phase')],
    });

    const template = await repository.findById('villa');

    expect(template?.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(template?.nodes[0].children[0].id).toBe('a.1');
  });

  it('answers null for an unknown id', async () => {
    planTemplate.findUnique.mockResolvedValue(null);
    await expect(repository.findById('x')).resolves.toBeNull();
  });
});

describe('OrganizationPlanRepository', () => {
  const tx = {
    organizationPlan: { create: vi.fn(), update: vi.fn() },
    organizationPlanNode: { createMany: vi.fn(), deleteMany: vi.fn() },
  };
  const organizationPlan = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  };
  const repository = new OrganizationPlanRepository({
    organizationPlan,
    $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
  } as unknown as TenantPrismaClient);

  const aPlan = (): OrganizationPlan =>
    OrganizationPlan.create({
      id: 'plan-1',
      organizationId: 'org-1',
      sourceTemplateId: null,
      name: 'Plan',
      kind: WorksiteKind.BUILDING,
      nodes: buildPlanNodes([{ label: 'a', children: [{ label: 'b' }] }, { label: 'c' }]),
    });

  beforeEach(() => vi.resetAllMocks());

  it('names no organization when it reads: the tenant filter does', async () => {
    organizationPlan.findMany.mockResolvedValue([]);
    organizationPlan.findUnique.mockResolvedValue(null);

    await repository.findAll();
    await repository.findById('plan-1');

    expect(organizationPlan.findMany.mock.calls[0][0].where).toBeUndefined();
    expect(organizationPlan.findUnique.mock.calls[0][0].where).toEqual({
      id: 'plan-1',
    });
  });

  it('rebuilds a plan from its flat lines', async () => {
    organizationPlan.findUnique.mockResolvedValue({
      ...planRow,
      nodes: [
        {
          id: 'p',
          parentId: null,
          level: 'phase',
          label: 'a',
          isControl: false,
        },
        { id: 't', parentId: 'p', level: 'task', label: 'b', isControl: true },
      ],
    });

    const plan = await repository.findById('plan-1');

    expect(plan?.nodes[0].children[0]).toMatchObject({
      id: 't',
      level: PlanNodeLevel.TASK,
      isControl: true,
    });
  });

  it('writes parents before children, numbered within each parent', async () => {
    await repository.create(aPlan());

    const rows = tx.organizationPlanNode.createMany.mock.calls[0][0].data;
    expect(rows.map((row: { label: string }) => row.label)).toEqual(['a', 'b', 'c']);
    expect(rows.map((row: { sortOrder: number }) => row.sortOrder)).toEqual([1, 1, 2]);
    expect(rows[1].parentId).toBe(rows[0].id);
    expect(rows[0].organizationId).toBe('org-1');
  });

  it('replaces the lines after updating the plan', async () => {
    await repository.replace(aPlan());

    expect(tx.organizationPlan.update.mock.invocationCallOrder[0]).toBeLessThan(
      tx.organizationPlanNode.deleteMany.mock.invocationCallOrder[0],
    );
    expect(tx.organizationPlanNode.deleteMany).toHaveBeenCalledWith({
      where: { planId: 'plan-1' },
    });
    expect(tx.organizationPlanNode.createMany).toHaveBeenCalledOnce();
  });

  it('says whether something was deleted', async () => {
    organizationPlan.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(repository.delete('plan-1')).resolves.toBe(true);
    await expect(repository.delete('other')).resolves.toBe(false);
  });
});
