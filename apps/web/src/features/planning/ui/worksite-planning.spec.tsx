import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanNodeLevel, type IWorksiteTask } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorksitePlanning } from './worksite-planning';

let canManage = true;
vi.mock('@/features/auth', () => ({ usePermission: () => canManage }));

const subtask: IWorksiteTask = {
  id: 'sub-1',
  level: PlanNodeLevel.SUBTASK,
  label: 'Coulage des semelles',
  isControl: false,
  plannedStart: '2026-01-05',
  plannedEnd: '2026-01-06',
  progress: 0,
  children: [],
};
const control: IWorksiteTask = {
  ...subtask,
  id: 'task-2',
  level: PlanNodeLevel.TASK,
  label: 'Réception du fond de fouille',
  isControl: true,
};
const task: IWorksiteTask = {
  ...subtask,
  id: 'task-1',
  level: PlanNodeLevel.TASK,
  label: 'Fondations',
  children: [subtask],
};
const phase: IWorksiteTask = {
  ...subtask,
  id: 'phase-1',
  level: PlanNodeLevel.PHASE,
  label: 'Gros œuvre',
  children: [task, control],
};
const PLAN_URL = '/worksites/ws-1/plan';
const TEMPLATE_ID = 'c0000000-0000-4000-8000-000000000001';

let mock: MockAdapter;

function serveSources() {
  mock
    .onGet('/plan-templates')
    .reply(200, [
      { id: TEMPLATE_ID, code: 'villa', kind: 'building', labels: { fr: 'Villa' }, nodeCount: 3 },
    ]);
  mock
    .onGet('/organization-plans')
    .reply(200, [{ id: 'own-1', sourceTemplateId: null, name: 'Maison type', kind: 'building' }]);
}

beforeEach(() => {
  canManage = true;
  mock = new MockAdapter(apiClient);
  // jsdom has no modal dialog.
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

describe('WorksitePlanning, before it exists', () => {
  beforeEach(() => {
    mock.onGet(PLAN_URL).reply(200, { tasks: [] });
    serveSources();
  });

  it('starts from a reference plan, in the language of the page', async () => {
    mock.onPost(PLAN_URL).reply(201, { tasks: [] });
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    await screen.findByRole('option', { name: 'Villa' });
    fireEvent.change(screen.getByLabelText('Modèle de planning'), {
      target: { value: `template:${TEMPLATE_ID}` },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le planning' }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      templateId: TEMPLATE_ID,
      locale: 'fr',
    });
  });

  it('offers the organization’s own plans too', async () => {
    mock.onPost(PLAN_URL).reply(201, { tasks: [] });
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    await screen.findByRole('option', { name: 'Mon plan : Maison type' });
    fireEvent.change(screen.getByLabelText('Modèle de planning'), {
      target: { value: 'plan:own-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le planning' }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      organizationPlanId: 'own-1',
    });
  });

  it('cannot start without a choice', async () => {
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    await screen.findByLabelText('Modèle de planning');

    expect(screen.getByRole('button', { name: 'Créer le planning' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('says what is missing when the worksite has no period', async () => {
    mock.onPost(PLAN_URL).reply(400, {
      message: 'x',
      errors: [
        { field: 'plannedStartDate', code: 'form.errors.worksitePeriodRequired', message: 'x' },
      ],
    });
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    await screen.findByRole('option', { name: 'Villa' });
    fireEvent.change(screen.getByLabelText('Modèle de planning'), {
      target: { value: `template:${TEMPLATE_ID}` },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le planning' }));

    expect(await screen.findByText(/Renseignez d'abord les dates/)).toBeTruthy();
  });

  it('only says there is none to whoever cannot create it', async () => {
    canManage = false;
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    expect(await screen.findByText(/pas encore créé/)).toBeTruthy();
    expect(screen.queryByLabelText('Modèle de planning')).toBeNull();
  });
});

describe('WorksitePlanning, the chart', () => {
  beforeEach(() => {
    mock.onGet(PLAN_URL).reply(200, { tasks: [phase] });
  });

  it('shows phases and tasks, marks controls, and folds subtasks', async () => {
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    expect(await screen.findByText('Gros œuvre')).toBeTruthy();
    expect(screen.getAllByText('Point de contrôle').length).toBeGreaterThan(0);
    expect(screen.queryByText('Coulage des semelles')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Plier ou déplier Fondations' }));

    expect(screen.getByText('Coulage des semelles')).toBeTruthy();
  });

  it('moves a lowest line', async () => {
    mock.onPatch('/worksite-tasks/task-2').reply(204);
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Modifier les dates de Réception du fond de fouille',
      }),
    );
    fireEvent.change(screen.getByLabelText(/Fin prévue/), { target: { value: '2026-01-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({
      plannedStart: '2026-01-05',
      plannedEnd: '2026-01-09',
    });
  });

  it('restarts only after confirmation', async () => {
    mock.onDelete(PLAN_URL).reply(204);
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Recommencer le planning' }));
    expect(mock.history.delete).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le planning' }));

    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });

  it('gives a reader the chart without any action', async () => {
    canManage = false;
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    await screen.findByText('Gros œuvre');

    expect(screen.queryByRole('button', { name: /Modifier les dates/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recommencer le planning' })).toBeNull();
  });

  it('reports a planning it cannot load', async () => {
    mock.reset();
    mock.onGet(PLAN_URL).reply(500);
    renderWithProviders(<WorksitePlanning worksiteId="ws-1" />);

    expect(await screen.findByText('Impossible de charger le planning.')).toBeTruthy();
  });
});
