import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IWorker } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorkerListPage } from './worker-list-page';
import { WorkerList } from './worker-table';

/**
 * The workers screen, driven through its own components.
 *
 * Two properties are worth the setup, and neither is visible in a class name:
 *
 *   1. **Every row gets both actions, active or not.** Unlike an invitation,
 *      nothing about a worker's state ever hides a button — only a
 *      soft-deleted row would, and one never reaches this list at all.
 *   2. **"Aucun ouvrier" and "aucun ouvrier ne correspond" are different
 *      sentences.** Under an active search, the first one is a lie the reader
 *      can act on.
 */

vi.mock('@/features/auth', () => ({
  Can: ({ children }: { children: React.ReactNode }) => children,
  usePermission: () => true,
}));

const karim: IWorker = {
  id: 'worker-1',
  organizationId: 'org-1',
  name: 'Karim Benali',
  qualification: 'Maçon',
  hourlyRate: 18.5,
  active: true,
};

const amina: IWorker = {
  id: 'worker-2',
  organizationId: 'org-1',
  name: 'Amina Cherif',
  qualification: null,
  hourlyRate: 22,
  active: false,
};

let mock: MockAdapter;

function listBody(items: IWorker[]) {
  return { items, total: items.length, page: 1, limit: 20 };
}

/** Handlers only ever add — the first one registered always wins — so a fresh reply means a fresh mock. */
function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mockReply(200, listBody([karim, amina]));
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

describe('WorkerList', () => {
  it('shows every worker, active or not, with both actions', () => {
    renderWithProviders(<WorkerList workers={[karim, amina]} onEdit={() => {}} />);

    // Both shapes are in the DOM — one is hidden by CSS — so each button
    // appears twice; the compact card spells it "Modifier" with no name.
    expect(screen.getAllByRole('button', { name: /Modifier Karim Benali/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Modifier' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actif').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactif').length).toBeGreaterThan(0);
  });

  it('shows a dash for a worker with no qualification', () => {
    renderWithProviders(<WorkerList workers={[amina]} onEdit={() => {}} />);

    // The table cell reads "—"; the card reads the full hint sentence. Both
    // exist somewhere on screen, one hidden by CSS.
    expect(screen.getAllByText('—').length + screen.getAllByText('Sans qualification renseignée').length).toBeGreaterThan(
      0,
    );
  });

  it('calls onEdit with the row that was clicked', () => {
    const onEdit = vi.fn();
    renderWithProviders(<WorkerList workers={[karim, amina]} onEdit={onEdit} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Modifier Amina Cherif/ })[0]);

    expect(onEdit).toHaveBeenCalledWith(amina);
  });

  it('asks before deleting, and says the history survives', async () => {
    renderWithProviders(<WorkerList workers={[karim]} onEdit={() => {}} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Karim Benali/ })[0]);

    expect((await screen.findAllByText(/Karim Benali/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/restent inchangés/).length).toBeGreaterThan(0);
    expect(mock.history).toHaveLength(0);
  });

  it('deletes only once confirmed', async () => {
    renderWithProviders(<WorkerList workers={[karim]} onEdit={() => {}} />);
    mockReply(204);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Karim Benali/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer l’ouvrier' })[0]);

    await waitFor(() => {
      expect(mock.history.delete[0]?.url).toMatch(/\/workers\/worker-1$/);
    });
  });

  it('sends nothing when the question is dismissed', async () => {
    renderWithProviders(<WorkerList workers={[karim]} onEdit={() => {}} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Karim Benali/ })[0]);
    await waitFor(() =>
      expect([...document.querySelectorAll('dialog')].some((d) => d.open)).toBe(true),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler' })[0]);

    await waitFor(() =>
      expect([...document.querySelectorAll('dialog')].every((d) => !d.open)).toBe(true),
    );
    expect(mock.history).toHaveLength(0);
  });
});

describe('WorkerListPage', () => {
  it('lists what the API returns, with the count', async () => {
    renderWithProviders(<WorkerListPage />);

    expect(await screen.findAllByText('Karim Benali')).not.toHaveLength(0);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('sends the active filter to the server rather than filtering on screen', async () => {
    renderWithProviders(<WorkerListPage />);
    await screen.findAllByText('Karim Benali');

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'active' } });

    await waitFor(() => {
      const asked = mock.history.get.map((request) => String(request.url));
      expect(asked.some((path) => path.includes('active=true'))).toBe(true);
    });
  });

  it('says "aucun ouvrier" when there is none, and offers no way out', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(<WorkerListPage />);

    expect(await screen.findByText('Aucun ouvrier')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Effacer les filtres' })).toBeNull();
  });

  it('says "no result" under an active filter, and offers to clear it', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(<WorkerListPage />);
    await screen.findByText('Aucun ouvrier');

    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'inactive' } });

    expect(await screen.findByText('Aucun ouvrier ne correspond')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Effacer les filtres' }).length).toBeGreaterThan(0);
  });

  it('reports a failed load instead of showing an empty list', async () => {
    mockReply(500, { message: 'Base injoignable' });
    renderWithProviders(<WorkerListPage />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Base injoignable/)).toBeTruthy();
  });

  it('opens the create drawer, and it starts empty', async () => {
    renderWithProviders(<WorkerListPage />);
    await screen.findAllByText('Karim Benali');

    fireEvent.click(screen.getByRole('button', { name: 'Nouvel ouvrier' }));

    expect(await screen.findByText('Ajouter un ouvrier')).toBeTruthy();
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('');
  });

  it('opens the edit drawer prefilled with the row that was clicked', async () => {
    renderWithProviders(<WorkerListPage />);
    await screen.findAllByText('Karim Benali');

    fireEvent.click(screen.getAllByRole('button', { name: /Modifier Karim Benali/ })[0]);

    expect(await screen.findByText('Modifier l’ouvrier')).toBeTruthy();
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Karim Benali');
  });
});
