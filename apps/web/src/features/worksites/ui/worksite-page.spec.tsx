import { cleanup, fireEvent, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Permission, WorksiteStatus, type IWorksite } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { ActiveWorksites } from './active-worksites';
import { WorksitePage } from './worksite-page';

/**
 * The home page's cards and the page each opens.
 *
 *   1. **A card is a link to its worksite's page**, whole.
 *   2. **Money shows for whoever reads budgets, and only them** — the budget
 *      on a card, the costs on the page.
 *   3. **The page shows what other features hand it** — the machines, the
 *      contacts — and nothing of them when they are not handed in.
 */

let granted = new Set<Permission>(Object.values(Permission));
vi.mock('@/features/auth', () => ({
  Can: ({ permission, children }: { permission: Permission; children: React.ReactNode }) =>
    granted.has(permission) ? children : null,
  usePermission: (permission: Permission) => granted.has(permission),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const rn1: IWorksite = {
  id: 'ws-1',
  organizationId: 'org-1',
  code: 'RN1-2026',
  name: 'Réfection RN1',
  clientId: 'client-1',
  client: { id: 'client-1', displayName: 'Municipalité de Sousse' },
  address: 'RN1, PK 12',
  latitude: null,
  longitude: null,
  plannedStartDate: '2026-09-01T00:00:00.000Z',
  plannedEndDate: '2026-09-10T00:00:00.000Z',
  status: WorksiteStatus.IN_PROGRESS,
  totalBudget: 250000,
};

let mock: MockAdapter;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-05T10:00:00Z'));
  granted = new Set(Object.values(Permission));
  mock = new MockAdapter(apiClient);
  mock.onGet('/worksites/ws-1').reply(200, rn1);
  mock.onGet('/worksites/ws-1/costs').reply(200, {
    worksiteId: 'ws-1',
    laborCost: 0,
    expensesCost: 0,
    equipmentCost: 4500,
    actualCost: 4500,
    totalBudget: 250000,
    variance: 245500,
  });
  mock.onGet(/\/worksites\?/).reply(200, { items: [rn1], total: 1, page: 1, limit: 1 });
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  vi.useRealTimers();
  mock.restore();
  cleanup();
});

describe('ActiveWorksites — the home page', () => {
  it('asks for the worksites in progress, all at once', async () => {
    renderWithProviders(<ActiveWorksites />);

    await screen.findByText('Réfection RN1');
    const url = String(mock.history.get[0]?.url);
    expect(url).toContain('status=in_progress');
    expect(url).toContain('paginated=false');
  });

  it('makes each card a link to its worksite, with its client, schedule and budget', async () => {
    renderWithProviders(<ActiveWorksites />);

    const card = await screen.findByRole('link', { name: 'Ouvrir le chantier Réfection RN1' });
    expect(card.getAttribute('href')).toBe('/worksites/ws-1');
    expect(screen.getByText('Municipalité de Sousse')).toBeTruthy();
    expect(screen.getByText(/50 % du planning écoulé · 5 jours restants/)).toBeTruthy();
    expect(screen.getByText(/250\s?000/)).toBeTruthy();
  });

  it('keeps the budget off a foreman’s cards', async () => {
    granted = new Set([Permission.WORKSITE_READ]);
    const { totalBudget: _hidden, ...withoutBudget } = rn1;
    mock.onGet(/\/worksites\?/).reply(200, { items: [withoutBudget], total: 1, page: 1, limit: 1 });
    mock.resetHistory();
    renderWithProviders(<ActiveWorksites />);

    await screen.findByText('Réfection RN1');
    expect(screen.queryByText(/250\s?000/)).toBeNull();
  });

  it('says so when nothing is in progress, and when the list cannot load', async () => {
    mock.reset();
    mock.onGet(/\/worksites\?/).reply(200, { items: [], total: 0, page: 1, limit: 0 });
    renderWithProviders(<ActiveWorksites />);
    expect(await screen.findByText('Aucun chantier en cours')).toBeTruthy();
    cleanup();

    mock.reset();
    mock.onGet(/\/worksites\?/).reply(500, { message: 'Base injoignable' });
    renderWithProviders(<ActiveWorksites />);
    expect(await screen.findByText(/Base injoignable/)).toBeTruthy();
  });
});

describe('WorksitePage — one worksite', () => {
  function Machines({ worksiteId }: { worksiteId: string }) {
    return <p>machines of {worksiteId}</p>;
  }
  function Contacts({ clientId }: { clientId: string }) {
    return <p>contacts of {clientId}</p>;
  }

  it('shows its facts, its costs, and the panels handed in', async () => {
    renderWithProviders(<WorksitePage id="ws-1" Equipment={Machines} ClientContacts={Contacts} />);

    expect(await screen.findByRole('heading', { name: 'Réfection RN1' })).toBeTruthy();
    expect(screen.getByText('RN1, PK 12')).toBeTruthy();
    expect(screen.getByText('machines of ws-1')).toBeTruthy();
    expect(screen.getByText('contacts of client-1')).toBeTruthy();
    expect(await screen.findByText('Matériel')).toBeTruthy();
  });

  it('gives a foreman neither the costs nor the edit button', async () => {
    granted = new Set([Permission.WORKSITE_READ]);
    renderWithProviders(<WorksitePage id="ws-1" />);

    await screen.findByRole('heading', { name: 'Réfection RN1' });
    expect(screen.queryByText('Coûts')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
    expect(mock.history.get.some((request) => String(request.url).endsWith('/costs'))).toBe(false);
  });

  it('opens the worksite’s drawer to edit it', async () => {
    renderWithProviders(<WorksitePage id="ws-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Modifier' }));

    expect(await screen.findByText('Modifier le chantier')).toBeTruthy();
  });

  it('shows no contacts panel for a worksite without a client', async () => {
    mock.onGet('/worksites/ws-2').reply(200, { ...rn1, id: 'ws-2', clientId: null, client: null });
    renderWithProviders(<WorksitePage id="ws-2" ClientContacts={Contacts} />);

    await screen.findByRole('heading', { name: 'Réfection RN1' });
    expect(screen.queryByText(/contacts of/)).toBeNull();
    expect(screen.getAllByText('Sans client').length).toBeGreaterThan(0);
  });

  it('says a worksite is not found — another organization’s included', async () => {
    mock.onGet('/worksites/ws-9').reply(404, { message: 'Worksite with id ws-9 not found' });
    renderWithProviders(<WorksitePage id="ws-9" />);

    expect(await screen.findByText('Chantier introuvable')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Voir tous les chantiers' }).getAttribute('href')).toBe(
      '/worksites',
    );
  });

  it('reports any other failure as such', async () => {
    mock.onGet('/worksites/ws-8').reply(500, { message: 'Base injoignable' });
    renderWithProviders(<WorksitePage id="ws-8" />);

    expect(await screen.findByText(/Base injoignable/)).toBeTruthy();
  });
});
