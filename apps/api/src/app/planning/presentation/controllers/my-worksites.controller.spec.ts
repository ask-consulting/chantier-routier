import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@chantia/shared';
import { AuthenticatedUser } from '@shared/auth';
import {
  GetMyWorksiteQuery,
  GetMyWorksitesQuery,
  GetWorksiteMembersQuery,
  SetWorksiteMembersCommand,
  UpdateTaskProgressCommand,
} from '../../application/worksite-plan.messages';
import { MyWorksitesController, WorksiteMembersController } from './my-worksites.controller';
import { WorksiteTaskController } from './worksite-plan.controller';

const caller: AuthenticatedUser = {
  id: 'u',
  organizationId: 'org',
  role: UserRole.FOREMAN,
  email: 'chef@test',
};

describe('the « mes chantiers » routes', () => {
  it('pass who is asking, and today', async () => {
    const execute = vi.fn();
    const controller = new MyWorksitesController({ execute } as unknown as QueryBus);

    await controller.findAll(caller);
    await controller.findOne(caller, 'ws');

    const [list] = execute.mock.calls[0] as [GetMyWorksitesQuery];
    const [one] = execute.mock.calls[1] as [GetMyWorksiteQuery];
    expect(list).toBeInstanceOf(GetMyWorksitesQuery);
    expect(list.caller).toEqual({ id: 'u', role: UserRole.FOREMAN });
    expect(list.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(one.id).toBe('ws');
  });

  it('read and replace the members', async () => {
    const query = vi.fn();
    const command = vi.fn();
    const controller = new WorksiteMembersController(
      { execute: query } as unknown as QueryBus,
      { execute: command } as unknown as CommandBus,
    );

    await controller.find('ws');
    await controller.replace('org', 'ws', { userIds: ['a'] });

    expect(query.mock.calls[0]?.[0]).toEqual(new GetWorksiteMembersQuery('ws'));
    expect(command.mock.calls[0]?.[0]).toEqual(new SetWorksiteMembersCommand('org', 'ws', ['a']));
  });

  it('enter progress as the caller', async () => {
    const execute = vi.fn();
    const controller = new WorksiteTaskController({ execute } as unknown as CommandBus);

    await controller.updateProgress(caller, 't', { progress: 60 });

    expect(execute.mock.calls[0]?.[0]).toEqual(
      new UpdateTaskProgressCommand({ id: 'u', role: UserRole.FOREMAN }, 't', 60),
    );
  });
});
