import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { PayMode, UserRole } from '@chantia/shared';
import {
  AssignTaskWorkerCommand,
  GetTaskTeamQuery,
  LinkTaskEquipmentCommand,
  RemoveTaskWorkerCommand,
  UnlinkTaskEquipmentCommand,
} from '../../application/task-team.messages';
import { TaskTeamController } from './task-team.controller';

describe('the task team routes', () => {
  const query = vi.fn();
  const command = vi.fn();
  const controller = new TaskTeamController(
    { execute: query } as unknown as QueryBus,
    { execute: command } as unknown as CommandBus,
  );

  it('withholds rates from a role that does not read budgets', async () => {
    await controller.find(UserRole.SITE_MANAGER, 'ws');
    await controller.find(UserRole.FOREMAN, 'ws');

    expect(query.mock.calls.map((call) => call[0])).toEqual([
      new GetTaskTeamQuery('ws', true),
      new GetTaskTeamQuery('ws', false),
    ]);
  });

  it('passes each change down', async () => {
    const data = { workerId: 'w', payMode: PayMode.HOUR };
    await controller.assignWorker('org', 't', data);
    await controller.removeWorker('a');
    await controller.linkEquipment('org', 't', { equipmentAssignmentId: 'b' });
    await controller.unlinkEquipment('l');

    expect(command.mock.calls.map((call) => call[0])).toEqual([
      new AssignTaskWorkerCommand('org', 't', data),
      new RemoveTaskWorkerCommand('a'),
      new LinkTaskEquipmentCommand('org', 't', 'b'),
      new UnlinkTaskEquipmentCommand('l'),
    ]);
  });
});
