import { describe, expect, it, vi } from 'vitest';
import { ClientType } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { CreateClientCommand } from './commands/create-client.command';
import { CreateClientHandler } from './commands/create-client.handler';
import { DeleteClientCommand } from './commands/delete-client.command';
import { DeleteClientHandler } from './commands/delete-client.handler';
import { UpdateClientCommand } from './commands/update-client.command';
import { UpdateClientHandler } from './commands/update-client.handler';
import { GetClientByIdHandler } from './queries/get-client-by-id.handler';
import { GetClientByIdQuery } from './queries/get-client-by-id.query';
import { GetClientsHandler } from './queries/get-clients.handler';
import { GetClientsQuery } from './queries/get-clients.query';
import { ClientContact } from '../domain/entities/client-contact.entity';
import { Client } from '../domain/entities/client.entity';
import {
  ClientInUseException,
  UnknownClientContactException,
} from '../domain/exceptions/client.exceptions';
import { ClientRepositoryPort } from '../domain/ports/client-repository.port';

/**
 * The write side, against a repository double.
 *
 * The rule worth the most here: **a contact id is trusted only when it is
 * already this client's.** Contacts carry no tenant; without that check a
 * caller could name any contact id — another client's, another
 * organization's — and have it rewritten under their client.
 */

const OWN_CONTACT = '11111111-1111-4111-8111-111111111111';
const FOREIGN_CONTACT = '22222222-2222-4222-8222-222222222222';

function existing(): Client {
  return Client.create({
    id: 'client-1',
    organizationId: 'org-1',
    type: ClientType.LEGAL_ENTITY,
    legalName: 'Municipalité de Sousse',
    contacts: [ClientContact.create({ id: OWN_CONTACT, lastName: 'Trabelsi', isPrimary: true })],
  });
}

function setup(options: { client?: Client | null; worksites?: number } = {}) {
  const saved: Client[] = [];
  const repository = {
    search: vi.fn(async () => ({ items: [existing()], total: 1, page: 1, limit: 20 })),
    findById: vi.fn(async () => (options.client === undefined ? existing() : options.client)),
    save: vi.fn(async (client: Client) => {
      saved.push(client);
      return client;
    }),
    countActiveWorksites: vi.fn(async () => options.worksites ?? 0),
  } satisfies ClientRepositoryPort;
  return { repository, saved };
}

describe('CreateClientHandler', () => {
  it('creates an individual with contacts, the first one primary, blanks as null', async () => {
    const { repository, saved } = setup();

    await new CreateClientHandler(repository).execute(
      new CreateClientCommand('org-1', {
        type: ClientType.INDIVIDUAL,
        firstName: 'Karim',
        lastName: 'Benali',
        contacts: [
          { lastName: ' Benali ', mobilePhone: '+216 98 123 456', email: ' Karim@Mail.TN ' },
          { lastName: 'Cherif', position: '  ' },
        ],
      }),
    );

    const [client] = saved;
    expect(client.displayName).toBe('Benali Karim');
    expect(client.organizationId).toBe('org-1');
    expect(client.contacts.map((c) => c.isPrimary)).toEqual([true, false]);
    expect(client.contacts[0].lastName).toBe('Benali');
    expect(client.contacts[0].email).toBe('karim@mail.tn');
    expect(client.contacts[1].position).toBeNull();
    // Minted here, never taken from the caller.
    expect(client.contacts[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses a contact id on creation — a new client owns none', async () => {
    const { repository } = setup();

    await expect(
      new CreateClientHandler(repository).execute(
        new CreateClientCommand('org-1', {
          type: ClientType.LEGAL_ENTITY,
          legalName: 'STEG',
          contacts: [{ id: FOREIGN_CONTACT, lastName: 'X' }],
        }),
      ),
    ).rejects.toBeInstanceOf(UnknownClientContactException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('UpdateClientHandler', () => {
  it('keeps a contact by id, adds a new one, and moves the primary', async () => {
    const { repository, saved } = setup();

    await new UpdateClientHandler(repository).execute(
      new UpdateClientCommand('client-1', {
        contacts: [
          { id: OWN_CONTACT, lastName: 'Trabelsi' },
          { lastName: 'Gharbi', isPrimary: true },
        ],
      }),
    );

    const [client] = saved;
    expect(client.contacts).toHaveLength(2);
    expect(client.contacts[0].id).toBe(OWN_CONTACT);
    expect(client.primaryContact?.lastName).toBe('Gharbi');
  });

  it('refuses a contact id that is not this client’s', async () => {
    const { repository } = setup();

    await expect(
      new UpdateClientHandler(repository).execute(
        new UpdateClientCommand('client-1', {
          contacts: [{ id: FOREIGN_CONTACT, lastName: 'Hijack' }],
        }),
      ),
    ).rejects.toBeInstanceOf(UnknownClientContactException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('leaves the contacts alone when the payload does not mention them', async () => {
    const { repository, saved } = setup();

    await new UpdateClientHandler(repository).execute(
      new UpdateClientCommand('client-1', { billingAddress: { city: 'Sousse' } }),
    );

    expect(saved[0].contacts.map((c) => c.id)).toEqual([OWN_CONTACT]);
    expect(saved[0].billingAddress.city).toBe('Sousse');
  });

  it('answers not-found for an unknown or foreign client', async () => {
    const { repository } = setup({ client: null });

    await expect(
      new UpdateClientHandler(repository).execute(
        new UpdateClientCommand('nope', { legalName: 'X' }),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});

describe('DeleteClientHandler', () => {
  it('sets deletedAt — never a real delete', async () => {
    const { repository, saved } = setup();

    await new DeleteClientHandler(repository).execute(new DeleteClientCommand('client-1'));

    expect(saved[0].isDeleted()).toBe(true);
    expect(repository).not.toHaveProperty('delete');
  });

  it('refuses while current worksites still point at the client', async () => {
    const { repository } = setup({ worksites: 2 });

    await expect(
      new DeleteClientHandler(repository).execute(new DeleteClientCommand('client-1')),
    ).rejects.toBeInstanceOf(ClientInUseException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('answers not-found for an unknown or already deleted client', async () => {
    const { repository } = setup({ client: null });

    await expect(
      new DeleteClientHandler(repository).execute(new DeleteClientCommand('client-1')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(repository.countActiveWorksites).not.toHaveBeenCalled();
  });
});

describe('client queries', () => {
  it('hands the search through', async () => {
    const { repository } = setup();
    const params = { filters: { type: ClientType.LEGAL_ENTITY } };

    await new GetClientsHandler(repository).execute(new GetClientsQuery(params));

    expect(repository.search).toHaveBeenCalledWith(params);
  });

  it('answers not-found — never forbidden — for an unknown or foreign id', async () => {
    const { repository } = setup({ client: null });

    await expect(
      new GetClientByIdHandler(repository).execute(new GetClientByIdQuery('nope')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('returns the client', async () => {
    const { repository } = setup();

    const client = await new GetClientByIdHandler(repository).execute(
      new GetClientByIdQuery('client-1'),
    );

    expect(client.displayName).toBe('Municipalité de Sousse');
  });
});
