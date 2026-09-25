import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientType, Permission, type IClient } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { ClientListPage } from './client-list-page';
import { ClientSelect } from './client-select';
import { ClientList } from './client-table';

/**
 * The clients screen, and the picker other screens borrow.
 *
 *   1. **The primary contact is on the row, with a number to dial.**
 *   2. **A foreman reads, but has no actions.**
 *   3. **A refused delete says what to do** — a client with worksites is the
 *      expected refusal, not an error to show raw.
 */

let granted = new Set<Permission>(Object.values(Permission));
vi.mock('@/features/auth', () => ({
  Can: ({ permission, children }: { permission: Permission; children: React.ReactNode }) =>
    granted.has(permission) ? children : null,
  usePermission: (permission: Permission) => granted.has(permission),
}));

const sousse: IClient = {
  id: 'client-1',
  organizationId: 'org-1',
  type: ClientType.LEGAL_ENTITY,
  firstName: null,
  lastName: null,
  legalName: 'Municipalité de Sousse',
  displayName: 'Municipalité de Sousse',
  billingAddress: { line1: null, line2: null, postalCode: null, city: 'Sousse', country: 'TN' },
  contacts: [
    {
      id: 'contact-1',
      firstName: 'Sami',
      lastName: 'Trabelsi',
      position: null,
      mobilePhone: '+216 98 123 456',
      landlinePhone: null,
      email: null,
      isPrimary: true,
    },
  ],
};

const benali: IClient = {
  ...sousse,
  id: 'client-2',
  type: ClientType.INDIVIDUAL,
  firstName: 'Karim',
  lastName: 'Benali',
  legalName: null,
  displayName: 'Benali Karim',
  billingAddress: { ...sousse.billingAddress, city: null },
  contacts: [],
};

let mock: MockAdapter;

function listBody(items: IClient[]) {
  return { items, total: items.length, page: 1, limit: 20 };
}

function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

beforeEach(() => {
  granted = new Set(Object.values(Permission));
  mock = new MockAdapter(apiClient);
  mockReply(200, listBody([sousse, benali]));
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

describe('ClientList', () => {
  it('shows the primary contact with a number to dial', () => {
    renderWithProviders(<ClientList clients={[sousse]} onEdit={() => {}} />);

    expect(screen.getAllByText('Sami Trabelsi').length).toBeGreaterThan(0);
    const [dial] = screen.getAllByRole('link', { name: /98 123 456/ });
    expect(dial.getAttribute('href')).toBe('tel:+21698123456');
  });

  it('names the type, and says when the city is missing', () => {
    renderWithProviders(<ClientList clients={[benali]} onEdit={() => {}} />);

    expect(screen.getAllByText('Personne physique').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ville non renseignée').length).toBeGreaterThan(0);
  });

  it('gives a foreman no actions', () => {
    granted = new Set([Permission.CLIENT_READ]);
    renderWithProviders(<ClientList clients={[sousse]} onEdit={() => {}} />);

    expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull();
  });

  it('calls onEdit with the row clicked', () => {
    const onEdit = vi.fn();
    renderWithProviders(<ClientList clients={[sousse, benali]} onEdit={onEdit} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Modifier Benali Karim/ })[0]);

    expect(onEdit).toHaveBeenCalledWith(benali);
  });

  it('deletes once confirmed', async () => {
    renderWithProviders(<ClientList clients={[sousse]} onEdit={() => {}} />);
    mockReply(204);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Municipalité de Sousse/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer le client' })[0]);

    await waitFor(() => {
      expect(mock.history.delete[0]?.url).toMatch(/\/clients\/client-1$/);
    });
  });

  it('explains a refusal because of worksites, instead of the raw message', async () => {
    renderWithProviders(<ClientList clients={[sousse]} onEdit={() => {}} />);
    mockReply(409, { message: 'This client still has 2 worksite(s)' });

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Municipalité de Sousse/ })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer le client' })[0]);

    expect(
      (await screen.findAllByText(/Des chantiers sont encore rattachés à ce client/)).length,
    ).toBeGreaterThan(0);
  });
});

describe('ClientListPage', () => {
  it('lists what the API returns, with the count', async () => {
    renderWithProviders(<ClientListPage />);

    expect(await screen.findAllByText('Municipalité de Sousse')).not.toHaveLength(0);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('sends the type filter to the server', async () => {
    renderWithProviders(<ClientListPage />);
    await screen.findAllByText('Municipalité de Sousse');

    const filter = screen
      .getAllByLabelText('Type')
      .find((element) => element.closest('dialog') === null) as HTMLElement;
    fireEvent.change(filter, { target: { value: ClientType.INDIVIDUAL } });

    await waitFor(() => {
      const asked = mock.history.get.map((request) => String(request.url));
      expect(asked.some((path) => path.includes('type=individual'))).toBe(true);
    });
  });

  it('says "aucun client" when there is none, and "no result" under a search', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(<ClientListPage />);

    expect(await screen.findByText('Aucun client')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'tunis' } });
    expect(await screen.findByText('Aucun client ne correspond')).toBeTruthy();
  });

  it('reports a failed load', async () => {
    mockReply(500, { message: 'Base injoignable' });
    renderWithProviders(<ClientListPage />);

    expect(await screen.findByText(/Base injoignable/)).toBeTruthy();
  });

  it('opens the create drawer', async () => {
    renderWithProviders(<ClientListPage />);
    await screen.findAllByText('Municipalité de Sousse');

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau client' }));

    expect(await screen.findByText('Créer une fiche client')).toBeTruthy();
  });
});

describe('ClientSelect', () => {
  it('asks for every client at once, and lists them after "no client"', async () => {
    renderWithProviders(<ClientSelect label="Client" value="" onChange={() => {}} />);

    await screen.findByRole('option', { name: 'Municipalité de Sousse' });
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Aucun client', 'Municipalité de Sousse', 'Benali Karim']);
    expect(String(mock.history.get[0]?.url)).toContain('paginated=false');
  });

  it('keeps showing a current client that is not in the list', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(
      <ClientSelect
        label="Client"
        value="client-9"
        onChange={() => {}}
        current={{ id: 'client-9', displayName: 'Ancien client' }}
      />,
    );

    expect((screen.getByLabelText('Client') as HTMLSelectElement).value).toBe('client-9');
    expect(await screen.findByRole('option', { name: 'Ancien client' })).toBeTruthy();
  });

  it('hands the chosen id back', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ClientSelect label="Client" value="" onChange={onChange} />);
    await screen.findByRole('option', { name: 'Benali Karim' });

    fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'client-2' } });

    expect(onChange).toHaveBeenCalledWith('client-2');
  });
});
