import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { ClientType } from '@chantia/shared';
import { CreateClientCommand } from '../../application/commands/create-client.command';
import { DeleteClientCommand } from '../../application/commands/delete-client.command';
import { UpdateClientCommand } from '../../application/commands/update-client.command';
import { GetClientsQuery } from '../../application/queries/get-clients.query';
import { ClientContact } from '../../domain/entities/client-contact.entity';
import { Client } from '../../domain/entities/client.entity';
import { GetClientsDto } from '../dto/get-clients.dto';
import { ClientController } from './client.controller';

/**
 * What leaves the server for a client: the computed display name, the address
 * as one object, and the contacts primary first — the shape `IClient` promises.
 */

const client = Client.create({
  id: 'client-1',
  organizationId: 'org-1',
  type: ClientType.LEGAL_ENTITY,
  legalName: 'Municipalité de Sousse',
  billingAddress: { city: 'Sousse' },
  contacts: [
    ClientContact.create({ id: 'c-1', lastName: 'Trabelsi', mobilePhone: '+216 98 123 456' }),
  ],
  createdAt: new Date('2026-09-26T08:00:00Z'),
});

function build() {
  const queryBus = {
    execute: vi.fn(async (query: unknown) =>
      query instanceof GetClientsQuery ? { items: [client], total: 1, page: 1, limit: 20 } : client,
    ),
  };
  const commandBus = { execute: vi.fn(async () => client) };
  return {
    queryBus,
    commandBus,
    controller: new ClientController(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    ),
  };
}

describe('ClientController', () => {
  it('lists with the filters passed through and the response shaped', async () => {
    const { controller, queryBus } = build();
    const dto = Object.assign(new GetClientsDto(), {
      search: 'sousse',
      type: ClientType.LEGAL_ENTITY,
      sortField: 'billingCity',
    });

    const result = await controller.findAll(dto);

    const query = queryBus.execute.mock.calls[0][0] as GetClientsQuery;
    expect(query.params.filters).toEqual({ search: 'sousse', type: ClientType.LEGAL_ENTITY });
    expect(query.params.sort).toEqual({ field: 'billingCity', order: 'asc' });
    expect(result.items[0]).toMatchObject({
      displayName: 'Municipalité de Sousse',
      billingAddress: { city: 'Sousse', country: 'TN', line1: null },
      contacts: [{ id: 'c-1', lastName: 'Trabelsi', isPrimary: true }],
      createdAt: '2026-09-26T08:00:00.000Z',
    });
  });

  it('reads one', async () => {
    const { controller } = build();

    expect((await controller.findOne('client-1')).legalName).toBe('Municipalité de Sousse');
  });

  it('creates under the caller’s organization', async () => {
    const { controller, commandBus } = build();

    await controller.create('org-1', { type: ClientType.LEGAL_ENTITY, legalName: 'STEG' });

    const command = commandBus.execute.mock.calls[0][0] as CreateClientCommand;
    expect(command).toBeInstanceOf(CreateClientCommand);
    expect(command.organizationId).toBe('org-1');
  });

  it('updates and deletes by id', async () => {
    const { controller, commandBus } = build();

    await controller.update('client-1', { legalName: 'Commune de Sousse' });
    await expect(controller.remove('client-1')).resolves.toBeUndefined();

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateClientCommand);
    expect(commandBus.execute.mock.calls[1][0]).toBeInstanceOf(DeleteClientCommand);
  });
});
