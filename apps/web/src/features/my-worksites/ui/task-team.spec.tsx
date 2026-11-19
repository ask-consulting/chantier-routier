import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PayMode,
  Permission,
  PlanNodeLevel,
  type IMyWorksite,
  type IWorksiteTask,
} from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { TaskTeam } from './task-team';

let granted = new Set<Permission>();
vi.mock('@/features/auth', () => ({
  usePermission: (permission: Permission) => granted.has(permission),
}));

const ID = '11111111-1111-4111-8111-111111111111';
const worksite: IMyWorksite = {
  id: ID,
  code: 'C',
  name: 'Chantier',
  client: null,
  plannedStartDate: '2026-01-01',
  plannedEndDate: '2026-01-31',
  health: 'ok',
  progress: 0,
  plannedProgress: 0,
  delayDays: 0,
  phases: [{ label: 'Gros œuvre', plannedStart: null, plannedEnd: null, progress: 0 }],
  nextSteps: [],
  memberCount: 0,
};
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
const team = {
  workers: [
    {
      id: 'a',
      taskId: 't',
      workerId: 'w1',
      workerName: 'Karim',
      qualification: 'Maçon',
      payMode: PayMode.DAY,
      rate: 52000,
    },
  ],
  equipment: [
    {
      id: 'l',
      taskId: 's',
      equipmentAssignmentId: 'b',
      designation: 'Bétonnière',
      startDate: '2026-01-01',
      endDate: '2026-01-05',
    },
  ],
};

let mock: MockAdapter;
beforeEach(() => {
  granted = new Set([
    Permission.WORKSITE_MANAGE,
    Permission.BUDGET_READ,
    Permission.EQUIPMENT_READ,
  ]);
  mock = new MockAdapter(apiClient);
  mock.onGet(`/worksites/${ID}/plan`).reply(200, plan);
  mock.onGet(`/worksites/${ID}/task-team`).reply(200, team);
  mock.onGet(/\/workers/).reply(200, {
    items: [{ id: 'w2', name: 'Slim', qualification: null, hourlyRate: 6500 }],
    total: 1,
    page: 1,
    limit: 1,
  });
  mock.onGet(/\/equipment-assignments/).reply(200, {
    items: [{ id: 'b2', equipment: { designation: 'Niveleuse N-02' } }],
    total: 1,
    page: 1,
    limit: 100,
  });
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

describe('TaskTeam', () => {
  it('shows who and what works on each task and subtask, with the pay', async () => {
    renderWithProviders(<TaskTeam worksite={worksite} />);

    expect(await screen.findByText(/Karim · Au jour/)).toBeTruthy();
    expect(screen.getByText(/52,000/)).toBeTruthy();
    expect(screen.getByText('Bétonnière')).toBeTruthy();
    expect(screen.getByText('Coulage')).toBeTruthy();
  });

  it('keeps the pay from whoever cannot read budgets, and the actions from who cannot manage', async () => {
    granted = new Set();
    mock.onGet(`/worksites/${ID}/task-team`).reply(200, {
      ...team,
      workers: team.workers.map(({ rate: _rate, ...w }) => w),
    });
    renderWithProviders(<TaskTeam worksite={worksite} />);

    expect(await screen.findByText('Karim · Au jour')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Affecter à/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Retirer/ })).toBeNull();
  });

  it('puts a worker on a task by the day, at their rate unless another is typed', async () => {
    mock.onPost('/worksite-tasks/t/workers').reply(201, {});
    renderWithProviders(<TaskTeam worksite={worksite} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Affecter à Fondations' }));

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Slim' });
    fireEvent.change(within(dialog).getByLabelText('Ouvrier'), { target: { value: 'w2' } });
    expect(
      (within(dialog).getByLabelText(/Tarif journalier/) as HTMLInputElement).placeholder,
    ).toBe('52');
    fireEvent.click(within(dialog).getByRole('button', { name: "Ajouter l'ouvrier" }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      workerId: 'w2',
      payMode: 'day',
    });
  });

  it('wants an amount for a lump sum, in millimes once sent', async () => {
    mock.onPost('/worksite-tasks/t/workers').reply(201, {});
    renderWithProviders(<TaskTeam worksite={worksite} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Affecter à Fondations' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Slim' });
    fireEvent.change(within(dialog).getByLabelText('Ouvrier'), { target: { value: 'w2' } });
    fireEvent.change(within(dialog).getByLabelText('Mode de paie'), { target: { value: 'task' } });

    const add = within(dialog).getByRole('button', { name: "Ajouter l'ouvrier" });
    expect(add.hasAttribute('disabled')).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Montant pour la tâche/), {
      target: { value: '900,5' },
    });
    fireEvent.click(add);

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      workerId: 'w2',
      payMode: 'task',
      rate: 900500,
    });
  });

  it('says why a worker cannot be added twice', async () => {
    mock.onPost('/worksite-tasks/t/workers').reply(409, {
      message: 'x',
      errors: [{ field: 'workerId', code: 'form.errors.alreadyOnTask', message: 'x' }],
    });
    renderWithProviders(<TaskTeam worksite={worksite} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Affecter à Fondations' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Slim' });
    fireEvent.change(within(dialog).getByLabelText('Ouvrier'), { target: { value: 'w2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: "Ajouter l'ouvrier" }));

    expect(await within(dialog).findByText('Déjà affecté à cette tâche.')).toBeTruthy();
  });

  it('puts a booked machine on a subtask, and takes people and machines off', async () => {
    mock.onPost('/worksite-tasks/s/equipment').reply(204);
    mock.onDelete('/task-workers/a').reply(204);
    mock.onDelete('/task-equipment/l').reply(204);
    renderWithProviders(<TaskTeam worksite={worksite} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Affecter à Coulage' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Niveleuse N-02' });
    fireEvent.change(within(dialog).getByLabelText('Engin réservé sur le chantier'), {
      target: { value: 'b2' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: "Ajouter l'engin" }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      equipmentAssignmentId: 'b2',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retirer Karim de Fondations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Bétonnière de Coulage' }));
    await waitFor(() => expect(mock.history.delete).toHaveLength(2));
  });

  it('points to the planning when there is none', async () => {
    mock.onGet(`/worksites/${ID}/plan`).reply(200, { tasks: [] });
    renderWithProviders(<TaskTeam worksite={worksite} />);

    expect(await screen.findByText("Ce chantier n'a pas encore de planning")).toBeTruthy();
  });
});
