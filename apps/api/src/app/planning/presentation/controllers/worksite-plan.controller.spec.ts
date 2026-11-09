import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import {
  DeleteWorksitePlanCommand,
  GetWorksitePlanQuery,
  InitializeWorksitePlanCommand,
  UpdateWorksiteTaskCommand,
} from '../../application/worksite-plan.messages';
import { WorksitePlanController, WorksiteTaskController } from './worksite-plan.controller';

describe('the planning routes', () => {
  const query = vi.fn();
  const command = vi.fn();

  it('reads with no tenant, and names it only when creating', async () => {
    const controller = new WorksitePlanController(
      { execute: query } as unknown as QueryBus,
      { execute: command } as unknown as CommandBus,
    );

    await controller.find('ws-1');
    await controller.initialize('org-1', 'ws-1', { templateId: 'tpl' });
    await controller.remove('ws-1');

    expect(query.mock.calls[0]?.[0]).toEqual(new GetWorksitePlanQuery('ws-1'));
    expect(command.mock.calls[0]?.[0]).toEqual(
      new InitializeWorksitePlanCommand('org-1', 'ws-1', { templateId: 'tpl' }),
    );
    expect(command.mock.calls[1]?.[0]).toEqual(new DeleteWorksitePlanCommand('ws-1'));
  });

  it('moves a line by its id', async () => {
    const execute = vi.fn();
    const controller = new WorksiteTaskController({ execute } as unknown as CommandBus);
    const dates = { plannedStart: '2026-01-01', plannedEnd: '2026-01-02' };

    await controller.update('t-1', dates);

    expect(execute.mock.calls[0]?.[0]).toEqual(new UpdateWorksiteTaskCommand('t-1', dates));
  });
});
