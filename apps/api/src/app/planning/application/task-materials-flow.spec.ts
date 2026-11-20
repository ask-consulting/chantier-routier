import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialUnit, PlanNodeLevel } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  AlreadyOnTaskException,
  TaskNotAssignableException,
  UnknownMaterialException,
} from '../domain/exceptions/worksite-plan.exceptions';
import {
  GetTaskMaterialsHandler,
  PlanTaskMaterialHandler,
  RemoveTaskMaterialHandler,
  UpdateTaskMaterialHandler,
} from './task-materials.handlers';
import {
  GetTaskMaterialsQuery,
  PlanTaskMaterialCommand,
  RemoveTaskMaterialCommand,
  UpdateTaskMaterialCommand,
} from './task-materials.messages';

const materials = {
  findTask: vi.fn(),
  resolveMaterial: vi.fn(),
  findForWorksite: vi.fn(),
  isPlanned: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
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
const NEED = {
  id: 'n',
  taskId: 't',
  materialId: 'sand',
  labels: { fr: 'Sable' },
  label: null,
  unit: MaterialUnit.CUBIC_METRE,
  quantity: 12,
  unitPrice: 45_000,
  plannedCost: 540_000,
};

beforeEach(() => {
  vi.resetAllMocks();
  materials.findTask.mockResolvedValue({ worksiteId: 'ws', level: PlanNodeLevel.TASK });
  materials.resolveMaterial.mockResolvedValue({ catalogMaterialId: 'sand' });
  materials.isPlanned.mockResolvedValue(false);
  materials.add.mockResolvedValue(NEED);
});

describe('reading the materials of a worksite', () => {
  const read = new GetTaskMaterialsHandler(plans, materials);

  it('keeps prices for who reads budgets, and only for them', async () => {
    plans.findPeriod.mockResolvedValue({});
    materials.findForWorksite.mockResolvedValue([NEED]);

    await expect(read.execute(new GetTaskMaterialsQuery('ws', true))).resolves.toEqual([NEED]);
    const [withheld] = await read.execute(new GetTaskMaterialsQuery('ws', false));
    expect(withheld).not.toHaveProperty('unitPrice');
    expect(withheld).not.toHaveProperty('plannedCost');
    expect(withheld).toMatchObject({ quantity: 12, unit: MaterialUnit.CUBIC_METRE });
  });

  it('does not find another organization’s worksite', async () => {
    plans.findPeriod.mockResolvedValue(null);
    await expect(read.execute(new GetTaskMaterialsQuery('x', true))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe('planning a material on a task', () => {
  const plan = new PlanTaskMaterialHandler(materials);
  const run = (data: object = {}) =>
    plan.execute(
      new PlanTaskMaterialCommand('org', 't', { materialId: 'sand', quantity: 12, ...data }),
    );

  it('stores the quantity, and no price until one is given', async () => {
    await expect(run()).resolves.toEqual(NEED);
    expect(materials.add).toHaveBeenCalledWith({
      organizationId: 'org',
      taskId: 't',
      material: { catalogMaterialId: 'sand' },
      quantity: 12,
      unitPrice: null,
    });

    await run({ unitPrice: 45_000 });
    expect(materials.add.mock.calls[1]?.[0].unitPrice).toBe(45_000);
  });

  it('takes one of the organization’s own materials as well', async () => {
    materials.resolveMaterial.mockResolvedValue({ materialId: 'own' });
    await run({ materialId: 'own' });
    expect(materials.add.mock.calls[0]?.[0].material).toEqual({ materialId: 'own' });
  });

  it('refuses a phase, an unknown task, an unknown material and a second line', async () => {
    materials.findTask.mockResolvedValueOnce({ worksiteId: 'ws', level: PlanNodeLevel.PHASE });
    await expect(run()).rejects.toBeInstanceOf(TaskNotAssignableException);

    materials.findTask.mockResolvedValueOnce(null);
    await expect(run()).rejects.toBeInstanceOf(ResourceNotFoundException);

    materials.resolveMaterial.mockResolvedValueOnce(null);
    await expect(run()).rejects.toBeInstanceOf(UnknownMaterialException);

    materials.isPlanned.mockResolvedValueOnce(true);
    await expect(run()).rejects.toBeInstanceOf(AlreadyOnTaskException);

    expect(materials.add).not.toHaveBeenCalled();
  });
});

describe('changing and removing a planned material', () => {
  it('changes a line of the caller’s, and finds no other', async () => {
    const update = new UpdateTaskMaterialHandler(materials);
    materials.update.mockResolvedValueOnce(NEED).mockResolvedValueOnce(null);

    await expect(
      update.execute(new UpdateTaskMaterialCommand('n', { quantity: 12 })),
    ).resolves.toEqual(NEED);
    await expect(
      update.execute(new UpdateTaskMaterialCommand('x', { unitPrice: null })),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('removes a line of the caller’s, and finds no other', async () => {
    const remove = new RemoveTaskMaterialHandler(materials);
    materials.remove.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await remove.execute(new RemoveTaskMaterialCommand('n'));
    await expect(remove.execute(new RemoveTaskMaterialCommand('x'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
