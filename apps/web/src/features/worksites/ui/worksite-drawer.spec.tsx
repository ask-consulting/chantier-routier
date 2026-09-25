import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorksiteStatus, type IWorksite } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorksiteDrawer, type ClientPickerProps } from './worksite-drawer';

/** Stands in for the clients feature's picker, which the route hands in. */
function StubClientPicker({ label, value, onChange, error, current }: ClientPickerProps) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">—</option>
        {current && <option value={current.id}>{current.displayName}</option>}
        <option value="client-2">STEG</option>
      </select>
      {error && <span>{error}</span>}
    </label>
  );
}

/**
 * One drawer, two doors — create when `worksite` is `null`, edit otherwise.
 *
 * Three properties worth pinning beyond "it posts":
 *
 *   1. **Without `budget:manage`, the budget never travels.** The box is gone,
 *      and so is the key: sending an empty box back would clear a figure the
 *      user was never shown.
 *   2. **A date the API stored as midnight UTC reads back as the same day.**
 *   3. **A taken code lands under the code field**, not in a generic alert.
 */

let canManageBudget = true;
vi.mock('@/features/auth', () => ({
  usePermission: () => canManageBudget,
}));

const existing: IWorksite = {
  id: 'worksite-1',
  organizationId: 'org-1',
  code: 'RN7-2026',
  name: 'Réfection RN7',
  clientId: 'client-1',
  client: { id: 'client-1', displayName: 'Municipalité de Sousse' },
  address: null,
  latitude: null,
  longitude: null,
  plannedStartDate: '2026-09-01T00:00:00.000Z',
  plannedEndDate: '2026-12-15T00:00:00.000Z',
  status: WorksiteStatus.IN_PROGRESS,
  totalBudget: 250000,
};

let mock: MockAdapter;

/** Handlers only ever add — the first one registered always wins — so a fresh reply means a fresh mock. */
function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

function fillCreate(): void {
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'RN7-2026' } });
  fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Réfection RN7' } });
}

function save(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;
}

beforeEach(() => {
  canManageBudget = true;
  mock = new MockAdapter(apiClient);
  mockReply(200, { id: 'worksite-9' });
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

describe('WorksiteDrawer, creating', () => {
  it('cannot be saved while the code or the name is empty', () => {
    renderWithProviders(<WorksiteDrawer open onClose={() => {}} />);

    expect(save().disabled).toBe(true);
    fillCreate();
    expect(save().disabled).toBe(false);
  });

  it('refuses an end before the start, and says so under the end date', () => {
    renderWithProviders(<WorksiteDrawer open onClose={() => {}} />);
    fillCreate();

    fireEvent.change(screen.getByLabelText('Début prévu'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Fin prévue'), { target: { value: '2026-09-01' } });

    expect(save().disabled).toBe(true);
    expect(screen.getByText('La fin prévue ne peut pas précéder le début')).toBeTruthy();
  });

  it('creates through POST /worksites — trimmed, blanks as null, budget parsed', async () => {
    renderWithProviders(<WorksiteDrawer open onClose={() => {}} />);
    fillCreate();
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: '  Réfection RN7  ' } });
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '250000' } });

    fireEvent.click(save());

    await waitFor(() => {
      const request = mock.history.post[0];
      expect(request?.url).toMatch(/\/worksites$/);
      expect(JSON.parse(request?.data as string)).toEqual({
        code: 'RN7-2026',
        name: 'Réfection RN7',
        clientId: null,
        address: null,
        plannedStartDate: null,
        plannedEndDate: null,
        status: WorksiteStatus.UPCOMING,
        totalBudget: 250000,
      });
    });
  });

  it('closes on success', async () => {
    const onClose = vi.fn();
    renderWithProviders(<WorksiteDrawer open onClose={onClose} />);
    fillCreate();

    fireEvent.click(save());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('puts a taken code under the code field, and stays open', async () => {
    mockReply(409, {
      message: 'A worksite with code RN7-2026 already exists',
      errors: [{ field: 'code', code: 'form.errors.worksiteCodeTaken', message: '…' }],
    });
    const onClose = vi.fn();
    renderWithProviders(<WorksiteDrawer open onClose={onClose} />);
    fillCreate();

    fireEvent.click(save());

    expect(await screen.findByText('Ce code est déjà utilisé par un autre chantier')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('RN7-2026');
  });

  it('falls back to a general alert for a refusal it cannot place', async () => {
    mockReply(400, { message: 'invalid' });
    renderWithProviders(<WorksiteDrawer open onClose={() => {}} />);
    fillCreate();

    fireEvent.click(save());

    expect(await screen.findByText('Vérifiez les champs : l’un d’eux n’est pas accepté.')).toBeTruthy();
  });
});

describe('WorksiteDrawer, editing', () => {
  it('prefills every field, dates as the stored day', () => {
    renderWithProviders(<WorksiteDrawer open worksite={existing} onClose={() => {}} />);

    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('RN7-2026');
    expect((screen.getByLabelText('Début prévu') as HTMLInputElement).value).toBe('2026-09-01');
    expect((screen.getByLabelText('Fin prévue') as HTMLInputElement).value).toBe('2026-12-15');
    expect((screen.getByLabelText('Statut') as HTMLSelectElement).value).toBe(
      WorksiteStatus.IN_PROGRESS,
    );
    expect((screen.getByLabelText('Budget') as HTMLInputElement).value).toBe('250000');
    expect(screen.getByText('Modifier le chantier')).toBeTruthy();
  });

  it('edits through PATCH on the worksite’s own id', async () => {
    renderWithProviders(<WorksiteDrawer open worksite={existing} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Statut'), {
      target: { value: WorksiteStatus.COMPLETED },
    });
    fireEvent.click(save());

    await waitFor(() => {
      const request = mock.history.patch[0];
      expect(request?.url).toMatch(/\/worksites\/worksite-1$/);
      expect(JSON.parse(request?.data as string)).toMatchObject({
        status: WorksiteStatus.COMPLETED,
        plannedStartDate: '2026-09-01',
      });
    });
  });

  it('clears the budget with null when the box is emptied', async () => {
    renderWithProviders(<WorksiteDrawer open worksite={existing} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '' } });
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string).totalBudget).toBeNull();
    });
  });

  it('without budget:manage, neither shows the budget nor sends it', async () => {
    canManageBudget = false;
    const { totalBudget: _hidden, ...withoutBudget } = existing;
    renderWithProviders(<WorksiteDrawer open worksite={withoutBudget} onClose={() => {}} />);

    expect(screen.queryByLabelText('Budget')).toBeNull();
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string)).not.toHaveProperty('totalBudget');
    });
  });
});

describe('WorksiteDrawer, the client', () => {
  it('offers no client field when no picker is handed in', () => {
    renderWithProviders(<WorksiteDrawer open onClose={() => {}} />);

    expect(screen.queryByLabelText('Client')).toBeNull();
  });

  it('prefills the picker with the worksite’s client, and sends the one chosen', async () => {
    renderWithProviders(
      <WorksiteDrawer open worksite={existing} onClose={() => {}} ClientPicker={StubClientPicker} />,
    );

    const picker = screen.getByLabelText('Client') as HTMLSelectElement;
    expect(picker.value).toBe('client-1');

    fireEvent.change(picker, { target: { value: 'client-2' } });
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string).clientId).toBe('client-2');
    });
  });

  it('sends null when the client is removed', async () => {
    renderWithProviders(
      <WorksiteDrawer open worksite={existing} onClose={() => {}} ClientPicker={StubClientPicker} />,
    );

    fireEvent.change(screen.getByLabelText('Client'), { target: { value: '' } });
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string).clientId).toBeNull();
    });
  });

  it('puts an unknown client under the picker', async () => {
    mockReply(400, {
      message: 'Client client-2 does not exist',
      errors: [{ field: 'clientId', code: 'form.errors.unknownClient', message: '…' }],
    });
    renderWithProviders(
      <WorksiteDrawer open worksite={existing} onClose={() => {}} ClientPicker={StubClientPicker} />,
    );

    fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'client-2' } });
    fireEvent.click(save());

    expect(await screen.findByText('Ce client n’existe pas ou plus')).toBeTruthy();
  });
});
