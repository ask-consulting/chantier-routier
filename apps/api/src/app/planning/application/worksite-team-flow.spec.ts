import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IWorksiteTask, PlanNodeLevel, UserRole } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  InvalidWorksiteMembersException,
  TaskProgressFromChildrenException,
} from '../domain/exceptions/worksite-plan.exceptions';
import { WorksiteWithPlan } from '../domain/ports/worksite-team.port';
import {
  GetMyWorksiteHandler,
  GetMyWorksitesHandler,
  GetWorksiteMembersHandler,
  SetWorksiteMembersHandler,
  UpdateTaskProgressHandler,
} from './worksite-team.handlers';
import {
  GetMyWorksiteQuery,
  GetMyWorksitesQuery,
  GetWorksiteMembersQuery,
  SetWorksiteMembersCommand,
  UpdateTaskProgressCommand,
} from './worksite-plan.messages';

const plans = {
  findPeriod: vi.fn(),
  findTree: vi.fn(),
  createIfEmpty: vi.fn(),
  deleteAll: vi.fn(),
  findTaskShape: vi.fn(),
  updateDates: vi.fn(),
  updateProgress: vi.fn(),
};
const team = {
  isMember: vi.fn(),
  listMembers: vi.fn(),
  findActiveUserIds: vi.fn(),
  replaceMembers: vi.fn(),
  findVisible: vi.fn(),
};
const ADMIN = { id: 'admin', role: UserRole.ADMIN };
const FOREMAN = { id: 'chef', role: UserRole.FOREMAN };

const leaf = (plannedEnd: string, progress: number): IWorksiteTask => ({
  id: plannedEnd,
  level: PlanNodeLevel.SUBTASK,
  label: plannedEnd,
  isControl: false,
  plannedStart: '2026-01-01',
  plannedEnd,
  progress,
  children: [],
});
const worksite = (id: string, tasks: IWorksiteTask[]): WorksiteWithPlan => ({
  id,
  code: id,
  name: id,
  client: null,
  plannedStartDate: '2026-01-01',
  plannedEndDate: '2026-03-01',
  tasks,
  memberCount: 2,
});

beforeEach(() => vi.resetAllMocks());

describe('« mes chantiers »', () => {
  const list = new GetMyWorksitesHandler(team);
  const one = new GetMyWorksiteHandler(team);

  it('asks for every worksite for an admin, and only their own for anybody else', async () => {
    team.findVisible.mockResolvedValue([]);

    await list.execute(new GetMyWorksitesQuery(ADMIN, '2026-01-10'));
    await list.execute(new GetMyWorksitesQuery(FOREMAN, '2026-01-10'));

    expect(team.findVisible.mock.calls).toEqual([[{}], [{ memberOf: 'chef' }]]);
  });

  it('summarizes each worksite from its planning, the late ones first', async () => {
    team.findVisible.mockResolvedValue([
      worksite('fine', [leaf('2026-02-01', 0)]),
      worksite('late', [leaf('2026-01-05', 50)]),
    ]);

    const result = await list.execute(new GetMyWorksitesQuery(FOREMAN, '2026-01-10'));

    expect(result.map((w) => [w.id, w.health, w.delayDays])).toEqual([
      ['late', 'late', 5],
      ['fine', 'ok', 0],
    ]);
    expect(result[0]).toMatchObject({ progress: 50, memberCount: 2 });
    expect(result[0]).not.toHaveProperty('tasks');
  });

  it('answers 404 for a worksite the caller may not see', async () => {
    team.findVisible.mockResolvedValueOnce([worksite('a', [])]).mockResolvedValueOnce([]);

    await expect(
      one.execute(new GetMyWorksiteQuery(FOREMAN, 'a', '2026-01-10')),
    ).resolves.toMatchObject({ id: 'a' });
    await expect(
      one.execute(new GetMyWorksiteQuery(FOREMAN, 'b', '2026-01-10')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(team.findVisible.mock.calls[1]?.[0]).toEqual({ memberOf: 'chef', id: 'b' });
  });
});

describe('entering progress', () => {
  const update = new UpdateTaskProgressHandler(plans, team);
  const enter = (caller = FOREMAN) =>
    update.execute(new UpdateTaskProgressCommand(caller, 't', 60));

  it('records it on a lowest line of one of the caller’s worksites', async () => {
    plans.findTaskShape.mockResolvedValue({ hasChildren: false, worksiteId: 'ws' });
    team.isMember.mockResolvedValue(true);

    await enter();

    expect(team.isMember).toHaveBeenCalledWith('ws', 'chef');
    expect(plans.updateProgress).toHaveBeenCalledWith('t', 60);
  });

  it('lets an admin enter it anywhere', async () => {
    plans.findTaskShape.mockResolvedValue({ hasChildren: false, worksiteId: 'ws' });

    await enter(ADMIN);

    expect(team.isMember).not.toHaveBeenCalled();
    expect(plans.updateProgress).toHaveBeenCalled();
  });

  it('answers 404 on a worksite the caller does not work on, or an unknown line', async () => {
    plans.findTaskShape.mockResolvedValueOnce({ hasChildren: false, worksiteId: 'ws' });
    team.isMember.mockResolvedValue(false);
    await expect(enter()).rejects.toBeInstanceOf(ResourceNotFoundException);

    plans.findTaskShape.mockResolvedValueOnce(null);
    await expect(enter()).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(plans.updateProgress).not.toHaveBeenCalled();
  });

  it('refuses a line that takes its progress from others', async () => {
    plans.findTaskShape.mockResolvedValue({ hasChildren: true, worksiteId: 'ws' });
    team.isMember.mockResolvedValue(true);

    await expect(enter()).rejects.toBeInstanceOf(TaskProgressFromChildrenException);
  });
});

describe('who works on a worksite', () => {
  const read = new GetWorksiteMembersHandler(plans, team);
  const set = new SetWorksiteMembersHandler(plans, team);

  it('lists them, and answers 404 for an unknown worksite', async () => {
    plans.findPeriod.mockResolvedValueOnce({ start: null, end: null }).mockResolvedValueOnce(null);
    team.listMembers.mockResolvedValue([{ userId: 'u' }]);

    await expect(read.execute(new GetWorksiteMembersQuery('ws'))).resolves.toEqual([
      { userId: 'u' },
    ]);
    await expect(read.execute(new GetWorksiteMembersQuery('x'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it('replaces them, each once', async () => {
    plans.findPeriod.mockResolvedValue({ start: null, end: null });
    team.findActiveUserIds.mockResolvedValue(['a', 'b']);

    await set.execute(new SetWorksiteMembersCommand('org', 'ws', ['a', 'b', 'a']));

    expect(team.replaceMembers).toHaveBeenCalledWith('org', 'ws', ['a', 'b']);
  });

  it('refuses an account that is unknown, inactive or another organization’s', async () => {
    plans.findPeriod.mockResolvedValue({ start: null, end: null });
    team.findActiveUserIds.mockResolvedValue(['a']);

    await expect(
      set.execute(new SetWorksiteMembersCommand('org', 'ws', ['a', 'b'])),
    ).rejects.toBeInstanceOf(InvalidWorksiteMembersException);
    expect(team.replaceMembers).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown worksite', async () => {
    plans.findPeriod.mockResolvedValue(null);

    await expect(set.execute(new SetWorksiteMembersCommand('org', 'x', []))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
