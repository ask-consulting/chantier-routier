import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationStatus, type IInvitationListItem } from '@chantia/shared';
import { renderWithProviders } from '@/test/render';
import { InvitationListPage } from './invitation-list-page';
import { InvitationList } from './invitation-table';

/**
 * The invitations screen, driven through its own components.
 *
 * Three properties are worth the setup, and none of them is visible in a class
 * name:
 *
 *   1. **Only a pending invitation gets buttons.** The API answers 409 on
 *      anything else, and the rule is the same shared function on both sides —
 *      but nothing enforces that the *screen* calls it, except this.
 *   2. **Cancelling asks first.** A destructive action one click deep, in a
 *      table of twenty rows, is a support ticket waiting to happen.
 *   3. **"No invitation" and "no result" are different sentences.** Under an
 *      active search, the first one is a lie the reader can act on.
 */

/**
 * The screen asks `auth` what the reader may do, to hide the actions a role
 * cannot perform. Here the answer is always yes: what is under test is the list,
 * not the permission matrix — which has its own tests in `@chantia/shared`.
 */
vi.mock('@/features/auth', () => ({
  Can: ({ children }: { children: React.ReactNode }) => children,
  usePermission: () => true,
}));

const pending: IInvitationListItem = {
  id: 'inv-1',
  userId: 'user-1',
  email: 'karim@exemple.fr',
  firstName: 'Karim',
  lastName: 'Benali',
  status: InvitationStatus.PENDING,
  expiresAt: '2099-01-15T00:00:00.000Z',
  acceptedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const accepted: IInvitationListItem = {
  ...pending,
  id: 'inv-2',
  email: 'amina@exemple.fr',
  firstName: 'Amina',
  lastName: 'Cherif',
  status: InvitationStatus.ACCEPTED,
  acceptedAt: '2026-09-02T00:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;

function listResponse(items: IInvitationListItem[]): Response {
  return new Response(JSON.stringify({ items, total: items.length, page: 1, limit: 20 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock = vi.fn(async () => listResponse([pending, accepted]));
  vi.stubGlobal('fetch', fetchMock);
  // jsdom 30 ships no <dialog> behaviour; the confirmation needs one to open.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('InvitationList', () => {
  it('offers the actions on a pending invitation only', () => {
    renderWithProviders(<InvitationList invitations={[pending, accepted]} />);

    // Both shapes are in the DOM — one is hidden by CSS — so each row appears
    // twice. What matters is that Amina, who has accepted, has none.
    expect(screen.getAllByRole('button', { name: /Karim Benali/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Amina Cherif/ })).toBeNull();
  });

  it('shows every invitation, whatever its status', () => {
    renderWithProviders(<InvitationList invitations={[pending, accepted]} />);

    expect(screen.getAllByText('karim@exemple.fr').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acceptée').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(0);
  });

  it('resends without asking — a second mail is harmless', async () => {
    renderWithProviders(<InvitationList invitations={[pending]} />);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ invitationPath: '/invitation/x', expiresAt: 'x' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Renvoyer/ })[0]);

    await waitFor(() => {
      const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(path).toMatch(/\/invitations\/inv-1\/resend$/);
      expect(init.method).toBe('POST');
    });
  });

  it('asks before cancelling, and says what will happen', async () => {
    renderWithProviders(<InvitationList invitations={[pending]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer l’invitation/ })[0]);

    // The question names the person and says the account survives — not "are
    // you sure?", which asks nothing. Both card and table render a dialog, so
    // the assertions count rather than expect one.
    expect((await screen.findAllByText(/Karim Benali/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Le compte, lui, reste/).length).toBeGreaterThan(0);
    // Nothing has been sent while the question is on screen.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels only once confirmed', async () => {
    renderWithProviders(<InvitationList invitations={[pending]} />);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer l’invitation/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer l’invitation' })[0]);

    await waitFor(() => {
      const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(path).toMatch(/\/invitations\/inv-1$/);
      expect(init.method).toBe('DELETE');
    });
  });

  it('sends nothing when the question is dismissed', async () => {
    renderWithProviders(<InvitationList invitations={[pending]} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer l’invitation de/ })[0]);
    // The dialog element is always in the tree; `open` is what says whether it
    // is on screen. Asserting on its text would pass while it is still showing.
    await waitFor(() =>
      expect([...document.querySelectorAll('dialog')].some((d) => d.open)).toBe(true),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler' })[0]);

    await waitFor(() =>
      expect([...document.querySelectorAll('dialog')].every((d) => !d.open)).toBe(true),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('InvitationListPage', () => {
  it('lists what the API returns, with the count', async () => {
    renderWithProviders(<InvitationListPage />);

    expect(await screen.findAllByText('karim@exemple.fr')).toHaveLength(2);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('sends the status filter to the server rather than filtering on screen', async () => {
    renderWithProviders(<InvitationListPage />);
    await screen.findAllByText('karim@exemple.fr');

    fireEvent.change(screen.getByLabelText('Statut'), {
      target: { value: InvitationStatus.ACCEPTED },
    });

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes(`status=${InvitationStatus.ACCEPTED}`))).toBe(true);
    });
  });

  it('says "no invitation" when there is none, and offers no way out', async () => {
    fetchMock.mockResolvedValue(listResponse([]));
    renderWithProviders(<InvitationListPage />);

    expect(await screen.findByText('Aucune invitation')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Effacer les filtres' })).toBeNull();
  });

  it('says "no result" under an active filter, and offers to clear it', async () => {
    fetchMock.mockResolvedValue(listResponse([]));
    renderWithProviders(<InvitationListPage />);
    await screen.findByText('Aucune invitation');

    fireEvent.change(screen.getByLabelText('Statut'), {
      target: { value: InvitationStatus.EXPIRED },
    });

    expect(await screen.findByText('Aucune invitation ne correspond')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Effacer les filtres' }).length).toBeGreaterThan(0);
  });

  it('reports a failed load instead of showing an empty list', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Base injoignable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderWithProviders(<InvitationListPage />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Base injoignable/)).toBeTruthy();
  });
});
