import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Permission,
  PlanNodeLevel,
  type IMyWorksite,
  type IWorksiteTask,
} from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { MyWorksitePage } from './my-worksite-page';
import { MyWorksitesPage } from './my-worksites-page';

let granted = new Set<Permission>();
vi.mock('@/features/auth', () => ({
  usePermission: (permission: Permission) => granted.has(permission),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const ID = '11111111-1111-4111-8111-111111111111';
const site = (over: Partial<IMyWorksite> = {}): IMyWorksite => ({
  id: ID,
  code: 'RN1-01',
  name: 'Réfection de la RN1',
  client: 'Direction régionale',
  plannedStartDate: '2026-01-01',
  plannedEndDate: '2026-01-31',
  health: 'late',
  progress: 42,
  plannedProgress: 60,
  delayDays: 9,
  phases: [
    { label: 'Préparation', plannedStart: '2026-01-01', plannedEnd: '2026-01-05', progress: 100 },
    { label: 'Chaussée', plannedStart: '2026-01-06', plannedEnd: '2026-01-31', progress: 20 },
  ],
  nextSteps: [{ label: 'Essai de densité', plannedStart: '2026-01-20', isControl: true }],
  memberCount: 2,
  ...over,
});
const line = (
  id: string,
  label: string,
  progress: number,
  children: IWorksiteTask[] = [],
): IWorksiteTask => ({
  id,
  level: children.length ? PlanNodeLevel.TASK : PlanNodeLevel.SUBTASK,
  label,
  isControl: false,
  plannedStart: '2026-01-06',
  plannedEnd: '2026-01-10',
  progress,
  children,
});
const plan = {
  tasks: [
    line('p1', 'Préparation', 100, [
      line('t1', 'Installation', 100, [line('s1', 'Base vie', 100)]),
    ]),
    line('p2', 'Chaussée', 20, [
      line('t2', 'Couche de base', 20, [line('s2', 'Mise en œuvre', 40), line('s3', 'Essai', 0)]),
    ]),
  ],
};

let mock: MockAdapter;
beforeEach(() => {
  granted = new Set([
    Permission.PROGRESS_RECORD,
    Permission.WORKSITE_MANAGE,
    Permission.EQUIPMENT_READ,
  ]);
  mock = new MockAdapter(apiClient);
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

const cards = () => screen.getAllByRole('link', { name: /^Ouvrir / });

describe('MyWorksitesPage', () => {
  it('shows the worksites the API returns, with their state and next step', async () => {
    mock
      .onGet('/my-worksites')
      .reply(200, [
        site(),
        site({ id: 'b', name: 'Villa', health: 'ok', delayDays: 0, client: null, nextSteps: [] }),
      ]);
    renderWithProviders(<MyWorksitesPage />);

    expect(await screen.findByText('Réfection de la RN1')).toBeTruthy();
    expect(cards()).toHaveLength(2);
    expect(cards()[0]?.getAttribute('href')).toBe(`/my-worksites/${ID}`);
    expect(screen.getByText(/1 en retard et 0 à contrôler/)).toBeTruthy();
    expect(screen.getByText('Sans client')).toBeTruthy();
    expect(screen.getByText('Rien de prévu')).toBeTruthy();
  });

  it('filters by state and by text', async () => {
    mock
      .onGet('/my-worksites')
      .reply(200, [site(), site({ id: 'b', name: 'Villa', health: 'ok' })]);
    renderWithProviders(<MyWorksitesPage />);
    await screen.findByText('Villa');

    fireEvent.click(screen.getByRole('button', { name: 'En retard · 1' }));
    expect(cards()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tous · 2' }));
    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'zzz' } });
    expect(screen.getByText('Aucun chantier ne correspond à cette recherche.')).toBeTruthy();
  });

  it('explains an empty page', async () => {
    mock.onGet('/my-worksites').reply(200, []);
    renderWithProviders(<MyWorksitesPage />);

    expect(await screen.findByText('Aucun chantier en cours ne vous est affecté')).toBeTruthy();
  });

  it('reports a failure', async () => {
    mock.onGet('/my-worksites').reply(500);
    renderWithProviders(<MyWorksitesPage />);

    expect(await screen.findByText('Impossible de charger vos chantiers.')).toBeTruthy();
  });
});

describe('MyWorksitePage', () => {
  beforeEach(() => {
    mock.onGet(`/my-worksites/${ID}`).reply(200, site());
    mock.onGet(`/worksites/${ID}/plan`).reply(200, plan);
  });

  it('shows where the worksite stands and what comes next', async () => {
    renderWithProviders(<MyWorksitePage id={ID} />);

    expect(await screen.findByRole('heading', { name: 'Réfection de la RN1' })).toBeTruthy();
    expect(screen.getByText('9 j')).toBeTruthy();
    expect(screen.getByText('Prévu à cette date : 60 %')).toBeTruthy();
    // In the « prochaine étape » figure, and at the top of what comes next.
    expect(screen.getAllByText('Essai de densité')).toHaveLength(2);
    expect(screen.getAllByText('Contrôle').length).toBeGreaterThan(0);
  });

  it('saves the progress of a subtask when it is released', async () => {
    mock.onPatch('/worksite-tasks/s2/progress').reply(204);
    renderWithProviders(<MyWorksitePage id={ID} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Avancement' }));

    const slider = await screen.findByLabelText('Mise en œuvre');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.keyUp(slider);

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({ progress: 80 });
  });

  it('says why progress cannot be saved on someone else’s worksite', async () => {
    mock.onPatch('/worksite-tasks/s2/progress').reply(404);
    renderWithProviders(<MyWorksitePage id={ID} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Avancement' }));

    const slider = await screen.findByLabelText('Mise en œuvre');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.blur(slider);

    expect(await screen.findByText(/que sur vos chantiers/)).toBeTruthy();
  });

  it('lets whoever cannot enter progress only read it', async () => {
    granted = new Set();
    renderWithProviders(<MyWorksitePage id={ID} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Avancement' }));

    expect((await screen.findByLabelText('Mise en œuvre')).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: "Saisir l'avancement" })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Matériel' })).toBeNull();
  });

  it('points to the planning when there is none', async () => {
    mock.onGet(`/worksites/${ID}/plan`).reply(200, { tasks: [] });
    renderWithProviders(<MyWorksitePage id={ID} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Avancement' }));

    expect(await screen.findByText("Ce chantier n'a pas encore de planning")).toBeTruthy();
  });

  it('changes the team', async () => {
    mock
      .onGet(`/worksites/${ID}/members`)
      .reply(200, [{ userId: 'u1', firstName: 'Mohamed', lastName: 'Ayari', role: 'foreman' }]);
    mock.onGet(/\/users/).reply(200, {
      items: [
        { id: 'u1', firstName: 'Mohamed', lastName: 'Ayari', role: 'foreman' },
        { id: 'u2', firstName: 'Slim', lastName: 'Gharbi', role: 'site_manager' },
      ],
      total: 2,
      page: 1,
      limit: 2,
    });
    mock.onPut(`/worksites/${ID}/members`).reply(204);
    renderWithProviders(<MyWorksitePage id={ID} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Équipe' }));
    expect(await screen.findByText('Mohamed Ayari')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: "Modifier l'équipe" }));
    fireEvent.click(await screen.findByLabelText('Slim Gharbi'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mock.history.put).toHaveLength(1));
    expect(JSON.parse(mock.history.put[0]?.data as string)).toEqual({ userIds: ['u1', 'u2'] });
  });

  it('lists the machines booked on it', async () => {
    mock.onGet(/\/equipment-assignments/).reply(200, {
      items: [
        {
          id: 'a',
          startDate: '2026-01-06',
          endDate: '2026-01-20',
          equipment: { id: 'e', designation: 'Niveleuse N-02', typeId: 't', fleetNumber: null },
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderWithProviders(<MyWorksitePage id={ID} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Matériel' }));

    expect(await screen.findByText('Niveleuse N-02')).toBeTruthy();
  });

  it('says a worksite the person may not see does not exist', async () => {
    mock.onGet(`/my-worksites/${ID}`).reply(404);
    renderWithProviders(<MyWorksitePage id={ID} />);

    expect(await screen.findByText('Chantier introuvable')).toBeTruthy();
  });
});
