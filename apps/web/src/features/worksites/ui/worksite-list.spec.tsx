import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Permission, WorksiteStatus, type IWorksite } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorksiteListPage } from './worksite-list-page';
import { WorksiteList } from './worksite-table';

/**
 * The worksites screen, driven through its own components.
 *
 * What is worth the setup:
 *
 *   1. **A foreman sees the rows, not the actions and not the money.** Both
 *      are permissions, and both are decided here rather than by the page.
 *   2. **Deleting asks first**, and the question points at the status for a
 *      site that is merely finished.
 *   3. **"Aucun chantier" and "aucun chantier ne correspond" are different
 *      sentences.**
 */

let granted = new Set<Permission>(Object.values(Permission));
vi.mock('@/features/auth', () => ({
  Can: ({ permission, children }: { permission: Permission; children: React.ReactNode }) =>
    granted.has(permission) ? children : null,
  usePermission: (permission: Permission) => granted.has(permission),
}));

const rn7: IWorksite = {
  id: 'worksite-1',
  organizationId: 'org-1',
  code: 'RN7-2026',
  name: 'Réfection RN7',
  clientId: 'client-1',
  client: { id: 'client-1', displayName: 'Ville de Casablanca' },
  address: null,
  latitude: null,
  longitude: null,
  plannedStartDate: null,
  plannedEndDate: null,
  status: WorksiteStatus.IN_PROGRESS,
  totalBudget: 250000,
};

const rocade: IWorksite = {
  ...rn7,
  id: 'worksite-2',
  code: 'ROC-01',
  name: 'Rocade nord',
  clientId: null,
  client: null,
  status: WorksiteStatus.COMPLETED,
  totalBudget: null,
};

let mock: MockAdapter;

function listBody(items: IWorksite[]) {
  return { items, total: items.length, page: 1, limit: 20 };
}

/** Handlers only ever add — the first one registered always wins — so a fresh reply means a fresh mock. */
function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

/**
 * The status filter — not the drawer's own "Statut", which is mounted (closed)
 * on the same page.
 */
function statusFilter(): HTMLElement {
  const outsideDialog = screen
    .getAllByLabelText('Statut')
    .find((element) => element.closest('dialog') === null);
  if (!outsideDialog) {
    throw new Error('No status filter on the page');
  }
  return outsideDialog;
}

beforeEach(() => {
  granted = new Set(Object.values(Permission));
  mock = new MockAdapter(apiClient);
  mockReply(200, listBody([rn7, rocade]));
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  mock.restore();
  cleanup();
});

describe('WorksiteList', () => {
  it('gives a manager both actions on every row, whatever the status', () => {
    renderWithProviders(<WorksiteList worksites={[rn7, rocade]} onEdit={() => {}} />);

    expect(screen.getAllByRole('button', { name: /Modifier Réfection RN7/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Supprimer Rocade nord/ }).length).toBeGreaterThan(0);
  });

  it('gives a foreman neither the actions nor the budget', () => {
    granted = new Set([Permission.WORKSITE_READ]);
    renderWithProviders(<WorksiteList worksites={[rn7]} onEdit={() => {}} />);

    expect(screen.getAllByText('Réfection RN7').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull();
    expect(screen.queryByText('Budget')).toBeNull();
  });

  it('calls onEdit with the row that was clicked', () => {
    const onEdit = vi.fn();
    renderWithProviders(<WorksiteList worksites={[rn7, rocade]} onEdit={onEdit} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Modifier Rocade nord/ })[0]);

    expect(onEdit).toHaveBeenCalledWith(rocade);
  });

  it('asks before deleting, and points at the status instead', async () => {
    renderWithProviders(<WorksiteList worksites={[rn7]} onEdit={() => {}} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Réfection RN7/ })[0]);

    expect((await screen.findAllByText(/changez plutôt son statut/)).length).toBeGreaterThan(0);
    expect(mock.history).toHaveLength(0);
  });

  it('deletes only once confirmed', async () => {
    renderWithProviders(<WorksiteList worksites={[rn7]} onEdit={() => {}} />);
    mockReply(204);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Réfection RN7/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer le chantier' })[0]);

    await waitFor(() => {
      expect(mock.history.delete[0]?.url).toMatch(/\/worksites\/worksite-1$/);
    });
  });
});

describe('WorksiteListPage', () => {
  it('lists what the API returns, with the count', async () => {
    renderWithProviders(<WorksiteListPage />);

    expect(await screen.findAllByText('Réfection RN7')).not.toHaveLength(0);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('sends the status filter to the server', async () => {
    renderWithProviders(<WorksiteListPage />);
    await screen.findAllByText('Réfection RN7');

    fireEvent.change(statusFilter(), {
      target: { value: WorksiteStatus.SUSPENDED },
    });

    await waitFor(() => {
      const asked = mock.history.get.map((request) => String(request.url));
      expect(asked.some((path) => path.includes('status=suspended'))).toBe(true);
    });
  });

  it('says "aucun chantier" when there is none', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(<WorksiteListPage />);

    expect(await screen.findByText('Aucun chantier pour l’instant')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Effacer les filtres' })).toBeNull();
  });

  it('says "no result" under an active filter, and offers to clear it', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(<WorksiteListPage />);
    await screen.findByText('Aucun chantier pour l’instant');

    fireEvent.change(statusFilter(), {
      target: { value: WorksiteStatus.COMPLETED },
    });

    expect(await screen.findByText('Aucun chantier ne correspond')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Effacer les filtres' }).length).toBeGreaterThan(0);
  });

  it('opens the create drawer, and it starts empty', async () => {
    renderWithProviders(<WorksiteListPage />);
    await screen.findAllByText('Réfection RN7');

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau chantier' }));

    expect(await screen.findByText('Créer un chantier')).toBeTruthy();
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('');
  });

  it('opens the edit drawer on the row, prefilled', async () => {
    renderWithProviders(<WorksiteListPage />);
    await screen.findAllByText('Réfection RN7');

    fireEvent.click(screen.getAllByRole('button', { name: /Modifier Réfection RN7/ })[0]);

    expect(await screen.findByText('Modifier le chantier')).toBeTruthy();
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('RN7-2026');
  });
});
