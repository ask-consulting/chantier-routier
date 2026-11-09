import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { WorksiteKind } from '@chantia/shared';
import {
  CreateOrganizationPlanCommand,
  DeleteOrganizationPlanCommand,
  UpdateOrganizationPlanCommand,
} from '../../application/commands/plan-library.commands';
import {
  GetOrganizationPlanQuery,
  GetOrganizationPlansQuery,
  GetPlanTemplateQuery,
  GetPlanTemplatesQuery,
} from '../../application/queries/plan-library.queries';
import { OrganizationPlan } from '../../domain/entities/organization-plan.entity';
import { OrganizationPlanController } from './organization-plan.controller';
import { PlanTemplateController } from './plan-template.controller';

const aPlan = (): OrganizationPlan =>
  OrganizationPlan.create({
    id: 'plan-1',
    organizationId: 'org-1',
    sourceTemplateId: 'villa',
    name: 'Plan',
    kind: WorksiteKind.BUILDING,
    nodes: [],
  });

describe('PlanTemplateController', () => {
  it('only reads: nothing here can change a reference plan', async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const controller = new PlanTemplateController({
      execute,
    } as unknown as QueryBus);

    await controller.findAll();
    await controller.findOne('villa');

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetPlanTemplatesQuery);
    expect(execute.mock.calls[1][0]).toEqual(new GetPlanTemplateQuery('villa'));
    const routes = Object.getOwnPropertyNames(PlanTemplateController.prototype);
    expect(routes.sort()).toEqual(['constructor', 'findAll', 'findOne']);
  });
});

describe('OrganizationPlanController', () => {
  const query = vi.fn();
  const command = vi.fn();
  const controller = new OrganizationPlanController(
    { execute: query } as unknown as QueryBus,
    { execute: command } as unknown as CommandBus,
  );

  it('reads with no tenant parameter', async () => {
    query.mockResolvedValue([aPlan()]);
    const list = await controller.findAll();
    expect(query.mock.calls[0][0]).toBeInstanceOf(GetOrganizationPlansQuery);
    expect(list[0]).not.toHaveProperty('nodes');

    query.mockResolvedValue(aPlan());
    const one = await controller.findOne('plan-1');
    expect(query.mock.calls[1][0]).toEqual(new GetOrganizationPlanQuery('plan-1'));
    expect(one).toHaveProperty('nodes');
  });

  it('never returns the organization id', async () => {
    query.mockResolvedValue(aPlan());
    expect(await controller.findOne('plan-1')).not.toHaveProperty('organizationId');
  });

  it('names the tenant only on creation', async () => {
    command.mockResolvedValue(aPlan());

    await controller.create('org-1', { sourceTemplateId: 'villa' });
    await controller.update('plan-1', { name: 'x' });
    await controller.remove('plan-1');

    expect(command.mock.calls[0][0]).toEqual(
      new CreateOrganizationPlanCommand('org-1', {
        sourceTemplateId: 'villa',
      }),
    );
    expect(command.mock.calls[1][0]).toEqual(
      new UpdateOrganizationPlanCommand('plan-1', { name: 'x' }),
    );
    expect(command.mock.calls[2][0]).toEqual(new DeleteOrganizationPlanCommand('plan-1'));
  });
});
