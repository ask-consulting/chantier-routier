import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@chantia/shared';
import { renderWithProviders } from '@/test/render';
import { InviteDrawer } from './invite-drawer';

/**
 * Creating an invitation, and the one thing that must not be lost on the way.
 *
 * The API hands the link over **exactly once** — only its hash is stored. So the
 * dialog's second state is not a nicety: it is the only moment that link exists,
 * and closing straight after "sent" would throw away the copy an admin needs
 * when the mail bounces or lands in spam.
 */

const issued = {
  user: {
    id: 'user-9',
    email: 'karim@exemple.fr',
    firstName: 'Karim',
    lastName: 'Benali',
    role: UserRole.WORKER,
  },
  invitationPath: '/invitation/jeton-en-clair',
  expiresAt: '2026-09-09T00:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fill(): void {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'karim@exemple.fr' },
  });
  fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Karim' } });
  fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Benali' } });
}

beforeEach(() => {
  fetchMock = vi.fn(async () => json(issued));
  vi.stubGlobal('fetch', fetchMock);
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

describe('InviteDrawer', () => {
  it('cannot be sent while a required field is empty', () => {
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);

    const submit = screen.getByRole('button', { name: 'Envoyer l’invitation' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fill();
    expect(submit.disabled).toBe(false);
  });

  it('creates the account through POST /users, trimmed', async () => {
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);
    fill();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  karim@exemple.fr  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));

    await waitFor(() => {
      const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(path).toMatch(/\/users$/);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        email: 'karim@exemple.fr',
        firstName: 'Karim',
        lastName: 'Benali',
        // The safest default: an admin created by a slip of the wheel is a
        // security problem, a worker is not.
        role: UserRole.WORKER,
        locale: 'fr',
      });
    });
  });

  it('shows the link afterwards, because the API hands it over only once', async () => {
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));

    expect(await screen.findByText(/jeton-en-clair/)).toBeTruthy();
    expect(screen.getByText(/Affiché une seule fois/)).toBeTruthy();
    // The form is gone: there is nothing left to fill in.
    expect(screen.queryByLabelText('Prénom')).toBeNull();
  });

  it('copies the link to the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));
    await screen.findByText(/jeton-en-clair/);

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/invitation/jeton-en-clair')));
    expect(await screen.findByRole('button', { name: 'Copié' })).toBeTruthy();
  });

  it('says the address is taken rather than "something went wrong"', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Email already used' }, 409));
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));

    expect(await screen.findByText('Cette adresse est déjà utilisée par un compte.')).toBeTruthy();
    // The form is still there, filled in: the address is one edit away.
    expect((screen.getByLabelText('Prénom') as HTMLInputElement).value).toBe('Karim');
  });

  it('clears the refusal as soon as a field changes', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Email already used' }, 409));
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));
    await screen.findByText('Cette adresse est déjà utilisée par un compte.');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'autre@exemple.fr' } });

    await waitFor(() =>
      expect(screen.queryByText('Cette adresse est déjà utilisée par un compte.')).toBeNull(),
    );
  });

  it('reports an unexpected failure without pretending it was the address', async () => {
    fetchMock.mockResolvedValue(json({ message: 'boom' }, 500));
    renderWithProviders(<InviteDrawer open onClose={() => {}} />);
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));

    expect(await screen.findByText('L’invitation n’a pas pu être créée.')).toBeTruthy();
  });
});
