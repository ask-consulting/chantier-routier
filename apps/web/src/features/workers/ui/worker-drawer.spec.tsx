import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IWorker } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorkerDrawer } from './worker-drawer';

/**
 * One drawer, two doors — create when `worker` is `null`, edit otherwise.
 *
 * Unlike an invitation, a worker produces nothing to hand back: success just
 * closes the drawer. That is the property worth pinning here — a form that
 * silently stays open after saving looks exactly like a form that failed.
 */

const existing: IWorker = {
  id: 'worker-1',
  organizationId: 'org-1',
  name: 'Karim Benali',
  qualification: 'Maçon',
  hourlyRate: 18.5,
  active: true,
};

let mock: MockAdapter;

/** Handlers only ever add — the first one registered always wins — so a fresh reply means a fresh mock. */
function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

function fillCreate(): void {
  fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Amina Cherif' } });
  fireEvent.change(screen.getByLabelText('Taux horaire'), { target: { value: '16' } });
}

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mockReply(200, { id: 'worker-9' });
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

describe('WorkerDrawer, creating', () => {
  it('cannot be saved while the name or the rate is empty', () => {
    renderWithProviders(<WorkerDrawer open onClose={() => {}} />);

    const save = screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fillCreate();
    expect(save.disabled).toBe(false);
  });

  it('refuses a rate of zero — nobody works for free', () => {
    renderWithProviders(<WorkerDrawer open onClose={() => {}} />);
    fillCreate();
    fireEvent.change(screen.getByLabelText('Taux horaire'), { target: { value: '0' } });

    expect((screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('does not show the active toggle — a new worker has no state to ask about', () => {
    renderWithProviders(<WorkerDrawer open onClose={() => {}} />);

    expect(screen.queryByLabelText('Actif')).toBeNull();
  });

  it('creates through POST /workers, trimmed and parsed', async () => {
    renderWithProviders(<WorkerDrawer open onClose={() => {}} />);
    fillCreate();
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: '  Amina Cherif  ' } });
    fireEvent.change(screen.getByLabelText('Qualification'), {
      target: { value: '  Conductrice d’engin  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      const request = mock.history.post[0];
      expect(request?.url).toMatch(/\/workers$/);
      expect(JSON.parse(request?.data as string)).toEqual({
        name: 'Amina Cherif',
        qualification: 'Conductrice d’engin',
        hourlyRate: 16,
        active: true,
      });
    });
  });

  it('sends null rather than an empty string for a blank qualification', async () => {
    renderWithProviders(<WorkerDrawer open onClose={() => {}} />);
    fillCreate();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      const request = mock.history.post[0];
      expect(JSON.parse(request?.data as string).qualification).toBeNull();
    });
  });

  it('closes on success — there is nothing left to show', async () => {
    const onClose = vi.fn();
    renderWithProviders(<WorkerDrawer open onClose={onClose} />);
    fillCreate();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('reports a refusal without pretending it was something else', async () => {
    mockReply(400, { message: 'invalid' });
    renderWithProviders(<WorkerDrawer open onClose={() => {}} />);
    fillCreate();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Vérifiez les champs : l’un d’eux n’est pas accepté.')).toBeTruthy();
  });

  it('stays open, filled in, when the save fails', async () => {
    mockReply(400, { message: 'invalid' });
    const onClose = vi.fn();
    renderWithProviders(<WorkerDrawer open onClose={onClose} />);
    fillCreate();

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await screen.findByText('Vérifiez les champs : l’un d’eux n’est pas accepté.');

    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Amina Cherif');
  });
});

describe('WorkerDrawer, editing', () => {
  it('prefills every field from the worker, active state included', () => {
    renderWithProviders(<WorkerDrawer open worker={existing} onClose={() => {}} />);

    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Karim Benali');
    expect((screen.getByLabelText('Qualification') as HTMLInputElement).value).toBe('Maçon');
    expect((screen.getByLabelText('Taux horaire') as HTMLInputElement).value).toBe('18.5');
    expect((screen.getByLabelText('Actif') as HTMLInputElement).checked).toBe(true);
  });

  it('edits through PATCH on the worker’s own id', async () => {
    renderWithProviders(<WorkerDrawer open worker={existing} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Taux horaire'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      const request = mock.history.patch[0];
      expect(request?.url).toMatch(/\/workers\/worker-1$/);
      expect(JSON.parse(request?.data as string)).toMatchObject({ hourlyRate: 21 });
    });
  });

  it('unchecking Actif sends active: false — the reversible, voluntary state', async () => {
    renderWithProviders(<WorkerDrawer open worker={existing} onClose={() => {}} />);

    fireEvent.click(screen.getByLabelText('Actif'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      const request = mock.history.patch[0];
      expect(JSON.parse(request?.data as string).active).toBe(false);
    });
  });

  it('titles itself for editing, not creating', () => {
    renderWithProviders(<WorkerDrawer open worker={existing} onClose={() => {}} />);

    expect(screen.getByText('Modifier l’ouvrier')).toBeTruthy();
    expect(screen.queryByText('Ajouter un ouvrier')).toBeNull();
  });
});
