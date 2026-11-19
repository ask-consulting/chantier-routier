import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@chantia/shared';
import {
  GetTaskMaterialsQuery,
  PlanTaskMaterialCommand,
  RemoveTaskMaterialCommand,
  UpdateTaskMaterialCommand,
} from '../../application/task-materials.messages';
import { TaskMaterialsController } from './task-materials.controller';

describe('the task materials routes', () => {
  const query = vi.fn();
  const command = vi.fn();
  const controller = new TaskMaterialsController(
    { execute: query } as unknown as QueryBus,
    { execute: command } as unknown as CommandBus,
  );

  it('withholds prices from a role that does not read budgets', async () => {
    await controller.find(UserRole.SITE_MANAGER, 'ws');
    await controller.find(UserRole.FOREMAN, 'ws');

    expect(query.mock.calls.map((call) => call[0])).toEqual([
      new GetTaskMaterialsQuery('ws', true),
      new GetTaskMaterialsQuery('ws', false),
    ]);
  });

  it('passes each change down', async () => {
    const data = { materialId: 'sand', quantity: 12 };
    await controller.plan('org', 't', data);
    await controller.update('n', { unitPrice: null });
    await controller.remove('n');

    expect(command.mock.calls.map((call) => call[0])).toEqual([
      new PlanTaskMaterialCommand('org', 't', data),
      new UpdateTaskMaterialCommand('n', { unitPrice: null }),
      new RemoveTaskMaterialCommand('n'),
    ]);
  });
});
