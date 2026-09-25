import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientType, type IClient } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { ClientDrawer } from './client-drawer';

/**
 * The client file, created and edited in one drawer.
 *
 *   1. **The name boxes follow the type**, and only the chosen type's names
 *      are sent — a person's first name never lands on a town hall.
 *   2. **Contacts are sent whole**, existing ones with their id, and there is
 *      always exactly one primary.
 *   3. **The country defaults to Tunisia.**
 */

const sousse: IClient = {
  id: 'client-1',
  organizationId: 'org-1',
  type: ClientType.LEGAL_ENTITY,
  firstName: null,
  lastName: null,
  legalName: 'Municipalité de Sousse',
  displayName: 'Municipalité de Sousse',
  billingAddress: {
    line1: 'Avenue Habib Bourguiba',
    line2: null,
    postalCode: '4000',
    city: 'Sousse',
    country: 'TN',
  },
  contacts: [
    {
      id: 'contact-1',
      firstName: 'Sami',
      lastName: 'Trabelsi',
      position: 'Directeur technique',
      mobilePhone: '+216 98 123 456',
      landlinePhone: null,
      email: null,
      isPrimary: true,
    },
    {
      id: 'contact-2',
      firstName: null,
      lastName: 'Gharbi',
      position: null,
      mobilePhone: null,
      landlinePhone: '+216 73 000 000',
      email: null,
      isPrimary: false,
    },
  ],
};

let mock: MockAdapter;

function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

function save(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;
}

function sent(method: 'post' | 'patch') {
  return JSON.parse(mock.history[method][0]?.data as string);
}

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mockReply(200, sousse);
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

describe('ClientDrawer, identity', () => {
  it('starts as a legal entity in Tunisia, and needs a legal name', () => {
    renderWithProviders(<ClientDrawer open onClose={() => {}} />);

    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe(ClientType.LEGAL_ENTITY);
    expect((screen.getByLabelText('Pays') as HTMLSelectElement).value).toBe('TN');
    expect(save().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Raison sociale'), { target: { value: 'STEG' } });
    expect(save().disabled).toBe(false);
  });

  it('asks a person for a last and a first name, and previews the display name', () => {
    renderWithProviders(<ClientDrawer open onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: ClientType.INDIVIDUAL } });
    expect(screen.queryByLabelText('Raison sociale')).toBeNull();

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Benali' } });
    expect(save().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Karim' } });

    expect(save().disabled).toBe(false);
    expect(screen.getByText('Apparaîtra comme « Benali Karim » dans les listes.')).toBeTruthy();
  });

  it('sends only the chosen type’s names', async () => {
    renderWithProviders(<ClientDrawer open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: ClientType.INDIVIDUAL } });
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Benali' } });
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Karim' } });
    // Back to a legal entity: the person's names stay in the boxes, unsent.
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: ClientType.LEGAL_ENTITY } });
    fireEvent.change(screen.getByLabelText('Raison sociale'), { target: { value: ' STEG ' } });

    fireEvent.click(save());

    await waitFor(() => {
      expect(sent('post')).toMatchObject({
        type: ClientType.LEGAL_ENTITY,
        firstName: null,
        lastName: null,
        legalName: 'STEG',
        billingAddress: { line1: null, city: null, country: 'TN' },
        contacts: [],
      });
    });
  });
});

describe('ClientDrawer, contacts', () => {
  it('makes the first contact added the primary one, and needs its last name', () => {
    renderWithProviders(<ClientDrawer open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Raison sociale'), { target: { value: 'STEG' } });

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un contact' }));

    const primary = screen.getByLabelText('Contact principal') as HTMLInputElement;
    expect(primary.checked).toBe(true);
    // Cannot be unticked — the way to change it is to tick another.
    expect(primary.disabled).toBe(true);
    expect(save().disabled).toBe(true);
  });

  it('refuses a malformed email, and says so under it', () => {
    renderWithProviders(<ClientDrawer open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Raison sociale'), { target: { value: 'STEG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un contact' }));
    fireEvent.change(screen.getAllByLabelText('Nom')[0], { target: { value: 'Trabelsi' } });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sami@' } });

    expect(save().disabled).toBe(true);
    expect(screen.getByText('Adresse email invalide')).toBeTruthy();
  });

  it('prefills the contacts, and sends them back whole with their ids', async () => {
    renderWithProviders(<ClientDrawer open client={sousse} onClose={() => {}} />);

    expect(screen.getByText('Sami Trabelsi')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un contact' }));
    const lastNames = screen.getAllByLabelText('Nom');
    fireEvent.change(lastNames[lastNames.length - 1], { target: { value: 'Mansour' } });
    fireEvent.change(screen.getAllByLabelText('Mobile')[2], { target: { value: '  +216 22 333 444 ' } });

    fireEvent.click(save());

    await waitFor(() => {
      const { contacts } = sent('patch');
      expect(contacts).toHaveLength(3);
      expect(contacts[0]).toMatchObject({ id: 'contact-1', lastName: 'Trabelsi', isPrimary: true });
      expect(contacts[1]).toMatchObject({ id: 'contact-2', landlinePhone: '+216 73 000 000' });
      expect(contacts[2]).toMatchObject({
        lastName: 'Mansour',
        mobilePhone: '+216 22 333 444',
        isPrimary: false,
      });
      expect(contacts[2]).not.toHaveProperty('id');
    });
  });

  it('moves the primary role, and hands it on when the primary is removed', async () => {
    renderWithProviders(<ClientDrawer open client={sousse} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retirer Sami Trabelsi' }));

    expect((screen.getByLabelText('Contact principal') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(save());

    await waitFor(() => {
      expect(sent('patch').contacts).toEqual([
        expect.objectContaining({ id: 'contact-2', isPrimary: true }),
      ]);
    });
  });

  it('switches the primary to the contact ticked', async () => {
    renderWithProviders(<ClientDrawer open client={sousse} onClose={() => {}} />);

    fireEvent.click(screen.getAllByLabelText('Contact principal')[1]);
    fireEvent.click(save());

    await waitFor(() => {
      expect(sent('patch').contacts.map((c: { isPrimary: boolean }) => c.isPrimary)).toEqual([
        false,
        true,
      ]);
    });
  });
});

describe('ClientDrawer, saving', () => {
  it('closes on success', async () => {
    const onClose = vi.fn();
    renderWithProviders(<ClientDrawer open client={sousse} onClose={onClose} />);

    fireEvent.click(save());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open and says why on a refusal', async () => {
    mockReply(400, { message: 'invalid' });
    const onClose = vi.fn();
    renderWithProviders(<ClientDrawer open client={sousse} onClose={onClose} />);

    fireEvent.click(save());

    expect(await screen.findByText('Vérifiez les champs : l’un d’eux n’est pas accepté.')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports anything else as a failure to save', async () => {
    mockReply(500, { message: 'boom' });
    renderWithProviders(<ClientDrawer open client={sousse} onClose={() => {}} />);

    fireEvent.click(save());

    expect(await screen.findByText('Le client n’a pas pu être enregistré.')).toBeTruthy();
  });
});
