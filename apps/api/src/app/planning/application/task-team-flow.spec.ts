import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PayMode, PlanNodeLevel } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  AlreadyOnTaskException,
  EquipmentNotOnWorksiteException,
  TaskNotAssignableException,
  TaskRateRequiredException,
  WorkerNotAvailableException,
} from '../domain/exceptions/worksite-plan.exceptions';
import {
  AssignTaskWorkerHandler,
  GetTaskTeamHandler,
  LinkTaskEquipmentHandler,
  RemoveTaskWorkerHandler,
  UnlinkTaskEquipmentHandler,
} from './task-team.handlers';
import {
  AssignTaskWorkerCommand,
  GetTaskTeamQuery,
  LinkTaskEquipmentCommand,
  RemoveTaskWorkerCommand,
  UnlinkTaskEquipmentCommand,
} from './task-team.messages';

const team = {
  findTask: vi.fn(),
  findActiveWorker: vi.fn(),
  findTeam: vi.fn(),
  isWorkerOnTask: vi.fn(),
  addWorker: vi.fn(),
  removeWorker: vi.fn(),
  findEquipmentAssignment: vi.fn(),
  isEquipmentOnTask: vi.fn(),
  linkEquipment: vi.fn(),
  unlinkEquipment: vi.fn(),
};
const plans = {
  findPeriod: vi.fn(),
  findTree: vi.fn(),
  createIfEmpty: vi.fn(),
  deleteAll: vi.fn(),
  findTaskShape: vi.fn(),
  updateDates: vi.fn(),
  updateProgress: vi.fn(),
};
const TASK = { worksiteId: 'ws', level: PlanNodeLevel.TASK };

beforeEach(() => {
  vi.resetAllMocks();
  team.findTask.mockResolvedValue(TASK);
  team.findActiveWorker.mockResolvedValue({ hourlyRate: 6500 });
  team.isWorkerOnTask.mockResolvedValue(false);
  team.addWorker.mockImplementation(async (row) => row);
});

describe('putting a worker on a task', () => {
  const assign = new AssignTaskWorkerHandler(team);
  const run = (data: object) =>
    assign.execute(new AssignTaskWorkerCommand('org', 't', { workerId: 'w', ...data } as never));

  it('proposes the worker’s rate by the hour, and a working day of it by the day', async () => {
    await run({ payMode: PayMode.HOUR });
    await run({ payMode: PayMode.DAY });

    expect(team.addWorker.mock.calls.map((call) => call[0].rate)).toEqual([6500, 52000]);
    expect(team.addWorker.mock.calls[0]?.[0]).toMatchObject({ organizationId: 'org', taskId: 't' });
  });

  it('takes an agreed rate over the default', async () => {
    await run({ payMode: PayMode.DAY, rate: 60000 });

    expect(team.addWorker.mock.calls[0]?.[0].rate).toBe(60000);
  });

  it('wants the amount when paid by the task', async () => {
    await expect(run({ payMode: PayMode.TASK })).rejects.toBeInstanceOf(TaskRateRequiredException);

    await run({ payMode: PayMode.TASK, rate: 900000 });
    expect(team.addWorker).toHaveBeenCalledOnce();
  });

  it('refuses a phase, an unknown task, a worker gone or one already on it', async () => {
    team.findTask.mockResolvedValueOnce({ ...TASK, level: PlanNodeLevel.PHASE });
    await expect(run({ payMode: PayMode.HOUR })).rejects.toBeInstanceOf(TaskNotAssignableException);

    team.findTask.mockResolvedValueOnce(null);
    await expect(run({ payMode: PayMode.HOUR })).rejects.toBeInstanceOf(ResourceNotFoundException);

    team.findActiveWorker.mockResolvedValueOnce(null);
    await expect(run({ payMode: PayMode.HOUR })).rejects.toBeInstanceOf(
      WorkerNotAvailableException,
    );

    team.isWorkerOnTask.mockResolvedValueOnce(true);
    await expect(run({ payMode: PayMode.HOUR })).rejects.toBeInstanceOf(AlreadyOnTaskException);

    expect(team.addWorker).not.toHaveBeenCalled();
  });

  it('takes a worker off, and answers 404 when there was nothing to take off', async () => {
    const remove = new RemoveTaskWorkerHandler(team);
    team.removeWorker.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await remove.execute(new RemoveTaskWorkerCommand('a'));
    await expect(remove.execute(new RemoveTaskWorkerCommand('b'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe('putting a machine on a task', () => {
  const link = new LinkTaskEquipmentHandler(team);
  const run = () => link.execute(new LinkTaskEquipmentCommand('org', 't', 'booking'));

  it('links a machine booked on the same worksite', async () => {
    team.findEquipmentAssignment.mockResolvedValue({ worksiteId: 'ws' });
    team.isEquipmentOnTask.mockResolvedValue(false);

    await run();

    expect(team.linkEquipment).toHaveBeenCalledWith('org', 't', 'booking');
  });

  it('refuses a machine booked elsewhere, or not at all, or already there', async () => {
    team.findEquipmentAssignment.mockResolvedValueOnce({ worksiteId: 'other' });
    await expect(run()).rejects.toBeInstanceOf(EquipmentNotOnWorksiteException);

    team.findEquipmentAssignment.mockResolvedValueOnce(null);
    await expect(run()).rejects.toBeInstanceOf(EquipmentNotOnWorksiteException);

    team.findEquipmentAssignment.mockResolvedValueOnce({ worksiteId: 'ws' });
    team.isEquipmentOnTask.mockResolvedValueOnce(true);
    await expect(run()).rejects.toBeInstanceOf(AlreadyOnTaskException);

    expect(team.linkEquipment).not.toHaveBeenCalled();
  });

  it('unlinks, and answers 404 when there was nothing to unlink', async () => {
    const unlink = new UnlinkTaskEquipmentHandler(team);
    team.unlinkEquipment.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await unlink.execute(new UnlinkTaskEquipmentCommand('a'));
    await expect(unlink.execute(new UnlinkTaskEquipmentCommand('b'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe('reading who works on the tasks', () => {
  const read = new GetTaskTeamHandler(plans, team);
  const TEAM = {
    workers: [
      {
        id: 'a',
        taskId: 't',
        workerId: 'w',
        workerName: 'K',
        qualification: null,
        payMode: PayMode.DAY,
        rate: 52000,
      },
    ],
    equipment: [],
  };

  it('shows rates to whoever reads budgets, and to nobody else', async () => {
    plans.findPeriod.mockResolvedValue({ start: null, end: null });
    team.findTeam.mockResolvedValue(TEAM);

    expect((await read.execute(new GetTaskTeamQuery('ws', true))).workers[0]).toHaveProperty(
      'rate',
      52000,
    );
    expect((await read.execute(new GetTaskTeamQuery('ws', false))).workers[0]).not.toHaveProperty(
      'rate',
    );
  });

  it('answers 404 for a worksite the caller cannot see', async () => {
    plans.findPeriod.mockResolvedValue(null);

    await expect(read.execute(new GetTaskTeamQuery('x', true))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
