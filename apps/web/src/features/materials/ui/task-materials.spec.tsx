import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MaterialUnit,
  Permission,
  PlanNodeLevel,
  type IWorksiteTask,
} from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { TaskMaterials } from './task-materials';

let granted = new Set<Permission>();
vi.mock('@/features/auth', () => ({
  usePermission: (permission: Permission) => granted.has(permission),
  Can: ({ children }: { children: unknown }) => children,
}));

const ID = '11111111-1111-4111-8111-111111111111';
const line = (
  id: string,
  label: string,
  level: PlanNodeLevel,
  children: IWorksiteTask[] = [],
): IWorksiteTask => ({
  id,
  level,
  label,
  isControl: false,
  plannedStart: null,
  plannedEnd: null,
  progress: 0,
  children,
});
const plan = {
  tasks: [
    line('p', 'Gros œuvre', PlanNodeLevel.PHASE, [
      line('t', 'Fondations', PlanNodeLevel.TASK, [line('s', 'Coulage', PlanNodeLevel.SUBTASK)]),
    ]),
  ],
};
const catalog = [
  {
    id: 'agg',
    code: 'aggregates',
    labels: { fr: 'Granulats et terres' },
    materials: [
      {
        id: 'sand',
        code: 'sand',
        categoryId: 'agg',
        unit: MaterialUnit.CUBIC_METRE,
        labels: { fr: 'Sable' },
      },
    ],
  },
  {
    id: 'bind',
    code: 'binders',
    labels: { fr: 'Liants et bétons' },
    materials: [
      {
        id: 'cement',
        code: 'cement',
        categoryId: 'bind',
        unit: MaterialUnit.BAG,
        labels: { fr: 'Ciment' },
      },
    ],
  },
];
const own = [{ id: 'oued', categoryId: 'agg', label: 'Sable de oued', unit: MaterialUnit.TONNE }];
const needs = [
  {
    id: 'n1',
    taskId: 't',
    materialId: 'cement',
    labels: { fr: 'Ciment' },
    label: null,
    unit: MaterialUnit.BAG,
    quantity: 120,
    unitPrice: 18_500,
    plannedCost: 2_220_000,
  },
  {
    id: 'n2',
    taskId: 's',
    materialId: 'oued',
    labels: {},
    label: 'Sable de oued',
    unit: MaterialUnit.TONNE,
    quantity: 2.5,
    unitPrice: null,
    plannedCost: null,
  },
];

let mock: MockAdapter;
beforeEach(() => {
  granted = new Set([Permission.WORKSITE_MANAGE, Permission.BUDGET_READ]);
  mock = new MockAdapter(apiClient);
  mock.onGet(`/worksites/${ID}/plan`).reply(200, plan);
  mock.onGet(`/worksites/${ID}/task-materials`).reply(200, needs);
  mock.onGet('/material-catalog').reply(200, catalog);
  mock.onGet('/materials').reply(200, own);
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  mock.restore();
  cleanup();
});

/** Opens the dialog of a task and picks a material in it. */
async function pick(task: string, categoryId: string, materialId: string, name: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Prévoir une matière pour ${task}` }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('option', { name: 'Granulats et terres' });
  fireEvent.change(within(dialog).getByLabelText('Famille'), { target: { value: categoryId } });
  await within(dialog).findByRole('option', { name });
  fireEvent.change(within(dialog).getByLabelText('Matière'), { target: { value: materialId } });
  return dialog;
}

describe('TaskMaterials', () => {
  it('shows what each task needs, in its unit, and what the phase costs', async () => {
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);

    expect(await screen.findByText(/Ciment · 120 sac · 2\s220/)).toBeTruthy();
    expect(screen.getByText('Sable de oued · 2,5 t')).toBeTruthy();
    expect(screen.getByText('Matières prévues sur la phase :')).toBeTruthy();
  });

  it('keeps prices and actions from whoever may not see or change them', async () => {
    granted = new Set();
    mock.onGet(`/worksites/${ID}/task-materials`).reply(
      200,
      needs.map(({ unitPrice: _p, plannedCost: _c, ...need }) => need),
    );
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);

    expect(await screen.findByText('Ciment · 120 sac')).toBeTruthy();
    expect(screen.queryByText('Matières prévues sur la phase :')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Prévoir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Retirer/ })).toBeNull();
  });

  it('plans a catalog material by quantity, with a price in millimes', async () => {
    mock.onPost('/worksite-tasks/t/materials').reply(201, {});
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);
    const dialog = await pick('Fondations', 'agg', 'sand', 'Sable');

    expect(within(dialog).getByLabelText('Quantité (m³)')).toBeTruthy();
    const save = within(dialog).getByRole('button', { name: 'Prévoir' });
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Quantité (m³)'), { target: { value: '12,5' } });
    fireEvent.change(within(dialog).getByLabelText('Prix unitaire prévu'), {
      target: { value: '45' },
    });
    expect(within(dialog).getByText(/Coût prévu : 562,500/)).toBeTruthy();
    fireEvent.click(save);

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      materialId: 'sand',
      quantity: 12.5,
      unitPrice: 45_000,
    });
  });

  it('offers the organization’s own materials beside the catalog, a price left out', async () => {
    mock.onPost('/worksite-tasks/s/materials').reply(201, {});
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);
    const dialog = await pick('Coulage', 'agg', 'oued', 'Sable de oued · Ajoutée');

    fireEvent.change(within(dialog).getByLabelText('Quantité (t)'), { target: { value: '3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prévoir' }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      materialId: 'oued',
      quantity: 3,
      unitPrice: null,
    });
  });

  it('says why a material cannot be planned twice on a task', async () => {
    mock.onPost('/worksite-tasks/t/materials').reply(409, {
      message: 'x',
      errors: [{ field: 'materialId', code: 'form.errors.alreadyOnTask', message: 'x' }],
    });
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);
    const dialog = await pick('Fondations', 'agg', 'sand', 'Sable');
    fireEvent.change(within(dialog).getByLabelText('Quantité (m³)'), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prévoir' }));

    expect(
      await within(dialog).findByText('Cette matière est déjà prévue sur cette tâche.'),
    ).toBeTruthy();
  });

  it('changes a quantity, takes a price away, and removes a line', async () => {
    mock.onPatch('/task-materials/n1').reply(200, {});
    mock.onDelete('/task-materials/n2').reply(204);
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Modifier Ciment sur Fondations' }));
    const dialog = await screen.findByRole('dialog');
    const quantity = within(dialog).getByLabelText('Quantité (sac)') as HTMLInputElement;
    expect(quantity.value).toBe('120');
    fireEvent.change(quantity, { target: { value: '150' } });
    fireEvent.change(within(dialog).getByLabelText('Prix unitaire prévu'), {
      target: { value: '' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({
      quantity: 150,
      unitPrice: null,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer Sable de oued de Coulage' }));
    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });

  it('refuses a negative price', async () => {
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);
    const dialog = await pick('Fondations', 'agg', 'sand', 'Sable');
    fireEvent.change(within(dialog).getByLabelText('Quantité (m³)'), { target: { value: '1' } });
    fireEvent.change(within(dialog).getByLabelText('Prix unitaire prévu'), {
      target: { value: '-3' },
    });

    expect(within(dialog).getByRole('button', { name: 'Prévoir' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('points to the planning when there is none', async () => {
    mock.onGet(`/worksites/${ID}/plan`).reply(200, { tasks: [] });
    renderWithProviders(<TaskMaterials worksiteId={ID} initialPhaseIndex={0} />);

    expect(await screen.findByText("Ce chantier n'a pas encore de planning")).toBeTruthy();
  });
});
