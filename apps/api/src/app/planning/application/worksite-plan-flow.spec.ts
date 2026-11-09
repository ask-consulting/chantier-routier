import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IWorksiteTask, PlanNodeLevel } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  InvalidPlanSourceException,
  InvalidTaskDatesException,
  TaskDatesFromChildrenException,
  WorksitePeriodRequiredException,
  WorksitePlanExistsException,
} from '../domain/exceptions/worksite-plan.exceptions';
import { NewTask, SourceNode } from '../domain/plan-tree';
import {
  DeleteWorksitePlanHandler,
  GetWorksitePlanHandler,
  InitializeWorksitePlanHandler,
  UpdateWorksiteTaskHandler,
} from './worksite-plan.handlers';
import {
  DeleteWorksitePlanCommand,
  GetWorksitePlanQuery,
  InitializeWorksitePlanCommand,
  UpdateWorksiteTaskCommand,
} from './worksite-plan.messages';

const repository = {
  findPeriod: vi.fn(),
  findTree: vi.fn(),
  createIfEmpty: vi.fn(),
  deleteAll: vi.fn(),
  findTaskShape: vi.fn(),
  updateDates: vi.fn(),
};
const sources = { findTemplate: vi.fn(), findOrganizationPlan: vi.fn() };
const node = (label: string, children: SourceNode[] = [], isControl = false): SourceNode => ({
  label,
  isControl,
  code: `code-${label}`,
  startPercent: null,
  durationPercent: null,
  children,
});
const task = (
  plannedStart: string | null,
  plannedEnd: string | null,
  children: IWorksiteTask[] = [],
): IWorksiteTask => ({
  id: 't',
  level: PlanNodeLevel.PHASE,
  label: 'x',
  isControl: false,
  plannedStart,
  plannedEnd,
  children,
});
const PERIOD = { start: '2026-01-01', end: '2026-01-10' };
const initialize = new InitializeWorksitePlanHandler(repository, sources);

beforeEach(() => {
  vi.resetAllMocks();
  repository.findTree.mockResolvedValue([]);
});

describe('starting a planning', () => {
  beforeEach(() => {
    repository.findPeriod.mockResolvedValue(PERIOD);
    repository.createIfEmpty.mockResolvedValue(true);
    sources.findTemplate.mockResolvedValue({
      nodes: [node('Fondations', [node('Fouilles'), node('Réception', [], true)])],
    });
  });

  const start = (data: object = { templateId: 'tpl' }) =>
    initialize.execute(new InitializeWorksitePlanCommand('org-1', 'ws-1', data));
  const written = (): NewTask[] => repository.createIfEmpty.mock.calls[0]?.[2] as NewTask[];

  it('copies the plan with its levels, order and control points', async () => {
    await start();

    expect(repository.createIfEmpty.mock.calls[0]?.slice(0, 2)).toEqual(['org-1', 'ws-1']);
    const [phase, first, second] = written();
    expect(phase).toMatchObject({ label: 'Fondations', level: 'phase', parentId: null });
    expect(first).toMatchObject({ level: 'task', parentId: phase?.id, sortOrder: 1 });
    expect(second).toMatchObject({ isControl: true, sortOrder: 2, sourceCode: 'code-Réception' });
  });

  it('proposes dates on the lowest lines only', async () => {
    await start();

    const [phase, first, second] = written();
    expect(phase?.plannedStart).toBeNull();
    expect(first).toMatchObject({ plannedStart: '2026-01-01', plannedEnd: '2026-01-05' });
    expect(second).toMatchObject({ plannedStart: '2026-01-06', plannedEnd: '2026-01-10' });
  });

  it('asks for French labels unless told otherwise', async () => {
    await start();
    await start({ templateId: 'tpl', locale: 'aeb-Latn' });

    expect(sources.findTemplate.mock.calls.map((call) => call[1])).toEqual(['fr', 'aeb-Latn']);
  });

  it('can start from one of the organization’s plans', async () => {
    sources.findOrganizationPlan.mockResolvedValue({ nodes: [node('Ma phase')] });

    await start({ organizationPlanId: 'plan-1' });

    expect(sources.findTemplate).not.toHaveBeenCalled();
    expect(written()[0]?.label).toBe('Ma phase');
  });

  it('wants exactly one source', async () => {
    await expect(start({})).rejects.toBeInstanceOf(InvalidPlanSourceException);
    await expect(start({ templateId: 'a', organizationPlanId: 'b' })).rejects.toBeInstanceOf(
      InvalidPlanSourceException,
    );
  });

  it('answers 404 for a worksite the caller cannot see, or an unknown plan', async () => {
    sources.findTemplate.mockResolvedValue(null);
    await expect(start()).rejects.toBeInstanceOf(ResourceNotFoundException);

    repository.findPeriod.mockResolvedValue(null);
    await expect(start()).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(repository.createIfEmpty).not.toHaveBeenCalled();
  });

  it('needs the worksite’s period to propose dates', async () => {
    repository.findPeriod.mockResolvedValue({ start: '2026-01-01', end: null });

    await expect(start()).rejects.toBeInstanceOf(WorksitePeriodRequiredException);
  });

  it('refuses to overwrite a planning', async () => {
    repository.createIfEmpty.mockResolvedValue(false);

    await expect(start()).rejects.toBeInstanceOf(WorksitePlanExistsException);
  });
});

describe('reading a planning', () => {
  const read = new GetWorksitePlanHandler(repository);

  it('gives a phase the dates of its lines', async () => {
    repository.findPeriod.mockResolvedValue(PERIOD);
    repository.findTree.mockResolvedValue([
      task(null, null, [task('2026-01-02', '2026-01-03'), task('2026-01-05', '2026-01-09')]),
    ]);

    const plan = await read.execute(new GetWorksitePlanQuery('ws-1'));

    expect(plan.tasks[0]).toMatchObject({ plannedStart: '2026-01-02', plannedEnd: '2026-01-09' });
  });

  it('answers 404 for a worksite the caller cannot see', async () => {
    repository.findPeriod.mockResolvedValue(null);

    await expect(read.execute(new GetWorksitePlanQuery('x'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe('deleting a planning', () => {
  const remove = new DeleteWorksitePlanHandler(repository);

  it('deletes only what the caller can see', async () => {
    repository.findPeriod.mockResolvedValueOnce(PERIOD).mockResolvedValueOnce(null);

    await remove.execute(new DeleteWorksitePlanCommand('ws-1'));
    await expect(remove.execute(new DeleteWorksitePlanCommand('x'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );

    expect(repository.deleteAll.mock.calls).toEqual([['ws-1']]);
  });
});

describe('moving a line', () => {
  const update = new UpdateWorksiteTaskHandler(repository);
  const move = (plannedStart: string, plannedEnd: string) =>
    update.execute(new UpdateWorksiteTaskCommand('t-1', { plannedStart, plannedEnd }));

  it('moves a lowest line, even past the end of the worksite', async () => {
    repository.findTaskShape.mockResolvedValue({ hasChildren: false });

    await move('2026-01-03', '2030-01-05');

    expect(repository.updateDates).toHaveBeenCalledWith('t-1', '2026-01-03', '2030-01-05');
  });

  it('refuses an end before the start', async () => {
    await expect(move('2026-01-05', '2026-01-03')).rejects.toBeInstanceOf(
      InvalidTaskDatesException,
    );
  });

  it('refuses a line that takes its dates from others', async () => {
    repository.findTaskShape.mockResolvedValue({ hasChildren: true });

    await expect(move('2026-01-01', '2026-01-02')).rejects.toBeInstanceOf(
      TaskDatesFromChildrenException,
    );
  });

  it('answers 404 for a line the caller cannot see', async () => {
    repository.findTaskShape.mockResolvedValue(null);

    await expect(move('2026-01-01', '2026-01-02')).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
