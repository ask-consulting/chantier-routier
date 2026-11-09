import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPlanTemplate, PlanNodeLevel, WorksiteKind } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { OrganizationPlan } from '../domain/entities/organization-plan.entity';
import {
  CreateOrganizationPlanHandler,
  DeleteOrganizationPlanHandler,
  UpdateOrganizationPlanHandler,
} from './commands/plan-library.handlers';
import {
  CreateOrganizationPlanCommand,
  DeleteOrganizationPlanCommand,
  UpdateOrganizationPlanCommand,
} from './commands/plan-library.commands';
import {
  GetOrganizationPlanHandler,
  GetOrganizationPlansHandler,
  GetPlanTemplateHandler,
  GetPlanTemplatesHandler,
} from './queries/plan-library.handlers';
import { GetOrganizationPlanQuery, GetPlanTemplateQuery } from './queries/plan-library.queries';

const template: IPlanTemplate = {
  id: 'villa',
  kind: WorksiteKind.BUILDING,
  labels: { fr: 'Villa', ar: 'فيلا' },
  nodes: [
    {
      id: 'villa.01',
      level: PlanNodeLevel.PHASE,
      isControl: false,
      labels: { fr: 'Fondations' },
      children: [
        {
          id: 'villa.01.01',
          level: PlanNodeLevel.TASK,
          isControl: true,
          labels: { fr: 'Réception', ar: 'استلام' },
          children: [],
        },
      ],
    },
  ],
};

const aPlan = (): OrganizationPlan =>
  OrganizationPlan.create({
    id: 'plan-1',
    organizationId: 'org-1',
    sourceTemplateId: null,
    name: 'Mon plan',
    kind: WorksiteKind.OTHER,
    nodes: [],
  });

describe('the plan library', () => {
  const repository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    replace: vi.fn(),
    delete: vi.fn(),
  };
  const catalog = { list: vi.fn(), findById: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('copying a reference plan', () => {
    const create = new CreateOrganizationPlanHandler(repository, catalog);

    it('copies its lines and control points for the organization', async () => {
      catalog.findById.mockResolvedValue(template);

      const plan = await create.execute(
        new CreateOrganizationPlanCommand('org-1', {
          sourceTemplateId: 'villa',
        }),
      );

      expect(plan.organizationId).toBe('org-1');
      expect(plan.sourceTemplateId).toBe('villa');
      expect(plan.name).toBe('Villa');
      expect(plan.kind).toBe(WorksiteKind.BUILDING);
      expect(plan.nodes[0].label).toBe('Fondations');
      expect(plan.nodes[0].children[0].isControl).toBe(true);
      expect(repository.create).toHaveBeenCalledWith(plan);
    });

    it('copies in the asked language, and falls back to French line by line', async () => {
      catalog.findById.mockResolvedValue(template);

      const plan = await create.execute(
        new CreateOrganizationPlanCommand('org-1', {
          sourceTemplateId: 'villa',
          locale: 'ar',
        }),
      );

      expect(plan.name).toBe('فيلا');
      expect(plan.nodes[0].label).toBe('Fondations');
      expect(plan.nodes[0].children[0].label).toBe('استلام');
    });

    it('gives the copy fresh identifiers, unrelated to the reference codes', async () => {
      catalog.findById.mockResolvedValue(template);

      const plan = await create.execute(
        new CreateOrganizationPlanCommand('org-1', {
          sourceTemplateId: 'villa',
        }),
      );

      expect(plan.nodes[0].id).not.toBe('villa.01');
    });

    it('answers 404 for an unknown reference plan', async () => {
      catalog.findById.mockResolvedValue(null);

      await expect(
        create.execute(
          new CreateOrganizationPlanCommand('org-1', {
            sourceTemplateId: 'nope',
          }),
        ),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('starts an empty plan when no reference is named', async () => {
      const plan = await create.execute(
        new CreateOrganizationPlanCommand('org-1', { name: 'Vide' }),
      );

      expect(plan.nodes).toEqual([]);
      expect(plan.sourceTemplateId).toBeNull();
      expect(plan.kind).toBe(WorksiteKind.OTHER);
    });

    it('refuses an empty plan without a name', async () => {
      await expect(
        create.execute(new CreateOrganizationPlanCommand('org-1', {})),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('changing a plan', () => {
    const update = new UpdateOrganizationPlanHandler(repository);
    const remove = new DeleteOrganizationPlanHandler(repository);

    it('replaces the tree', async () => {
      repository.findById.mockResolvedValue(aPlan());

      const plan = await update.execute(
        new UpdateOrganizationPlanCommand('plan-1', {
          nodes: [{ label: 'Nouvelle phase' }],
        }),
      );

      expect(plan.nodes.map((node) => node.label)).toEqual(['Nouvelle phase']);
      expect(repository.replace).toHaveBeenCalledWith(plan);
    });

    it('keeps the tree when only the name changes', async () => {
      repository.findById.mockResolvedValue(aPlan());

      const plan = await update.execute(
        new UpdateOrganizationPlanCommand('plan-1', { name: 'Renommé' }),
      );

      expect(plan.name).toBe('Renommé');
      expect(plan.nodes).toEqual([]);
    });

    it('answers 404 for a plan the caller cannot see', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        update.execute(new UpdateOrganizationPlanCommand('other', { name: 'x' })),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(repository.replace).not.toHaveBeenCalled();
    });

    it('deletes, and answers 404 when there was nothing to delete', async () => {
      repository.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await expect(
        remove.execute(new DeleteOrganizationPlanCommand('plan-1')),
      ).resolves.toBeUndefined();
      await expect(
        remove.execute(new DeleteOrganizationPlanCommand('other')),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe('reading', () => {
    it('lists the references and the plans', async () => {
      catalog.list.mockResolvedValue([]);
      repository.findAll.mockResolvedValue([aPlan()]);

      await expect(new GetPlanTemplatesHandler(catalog).execute()).resolves.toEqual([]);
      await expect(new GetOrganizationPlansHandler(repository).execute()).resolves.toHaveLength(1);
    });

    it('finds one of each, and answers 404 otherwise', async () => {
      catalog.findById.mockResolvedValueOnce(template).mockResolvedValueOnce(null);
      repository.findById.mockResolvedValueOnce(aPlan()).mockResolvedValueOnce(null);
      const templates = new GetPlanTemplateHandler(catalog);
      const plans = new GetOrganizationPlanHandler(repository);

      await expect(templates.execute(new GetPlanTemplateQuery('villa'))).resolves.toBe(template);
      await expect(templates.execute(new GetPlanTemplateQuery('x'))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      await expect(plans.execute(new GetOrganizationPlanQuery('plan-1'))).resolves.toBeDefined();
      await expect(plans.execute(new GetOrganizationPlanQuery('x'))).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });
  });
});
