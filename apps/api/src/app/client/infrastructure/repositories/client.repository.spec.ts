import { describe, expect, it, vi } from 'vitest';
import { ClientType } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { ClientContact } from '../../domain/entities/client-contact.entity';
import { Client } from '../../domain/entities/client.entity';
import { ClientRepository } from './client.repository';

/**
 * The repository against a Prisma double.
 *
 *   1. **Every read excludes soft-deleted rows**, and loads the contacts with
 *      the primary one first.
 *   2. **Contacts are written only under their own client.** A contact row
 *      carries no tenant, so every update is scoped by `{ id, clientId }`,
 *      and the deletion of dropped contacts by `clientId` — never by id alone.
 *   3. **It all happens in one transaction**, client row first.
 */

function clientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    type: 'legal_entity',
    firstName: null,
    lastName: null,
    legalName: 'Municipalité de Sousse',
    displayName: 'Municipalité de Sousse',
    billingLine1: null,
    billingLine2: null,
    billingPostalCode: '4000',
    billingCity: 'Sousse',
    billingCountry: 'TN',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [
      {
        id: 'contact-1',
        clientId: 'client-1',
        firstName: 'Sami',
        lastName: 'Trabelsi',
        position: 'Directeur technique',
        mobilePhone: '+216 98 123 456',
        landlinePhone: null,
        email: null,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  };
}

function setup(options: { existingContactIds?: string[] } = {}) {
  const existing = new Set(options.existingContactIds ?? []);
  const calls: string[] = [];
  const tx = {
    client: {
      upsert: vi.fn(async () => calls.push('client.upsert')),
      findUniqueOrThrow: vi.fn(async () => clientRow()),
    },
    clientContact: {
      deleteMany: vi.fn(async () => calls.push('contacts.deleteMany')),
      updateMany: vi.fn(async ({ where }: { where: { id: string } }) => ({
        count: existing.has(where.id) ? 1 : 0,
      })),
      create: vi.fn(async () => calls.push('contact.create')),
    },
  };
  const prisma = {
    client: {
      findMany: vi.fn(async () => [clientRow()]),
      count: vi.fn(async () => 1),
      findUnique: vi.fn(async () => clientRow()),
    },
    worksite: { count: vi.fn(async () => 3) },
    $transaction: vi.fn(async (work: (client: typeof tx) => unknown) => work(tx)),
  };

  return {
    tx,
    prisma,
    calls,
    repository: new ClientRepository(prisma as unknown as TenantPrismaClient),
  };
}

function aClient(contacts: ClientContact[]): Client {
  return Client.create({
    id: 'client-1',
    organizationId: 'org-1',
    type: ClientType.LEGAL_ENTITY,
    legalName: 'Municipalité de Sousse',
    contacts,
  });
}

describe('ClientRepository — reads', () => {
  it('excludes soft-deleted clients from the list and its count, sorted by name', async () => {
    const { repository, prisma } = setup();

    const result = await repository.search({ filters: { type: ClientType.LEGAL_ENTITY } });

    const args = prisma.client.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
      include: unknown;
    };
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.type).toBe(ClientType.LEGAL_ENTITY);
    expect(args.where.organizationId).toBeUndefined();
    expect(args.orderBy).toEqual({ displayName: 'asc' });
    expect(args.include).toEqual({
      contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
    });
    expect(
      (prisma.client.count.mock.calls[0][0] as { where: { deletedAt: null } }).where.deletedAt,
    ).toBeNull();
    expect(result.items[0].primaryContact?.lastName).toBe('Trabelsi');
  });

  it('searches the display name and the billing city', async () => {
    const { repository, prisma } = setup();

    await repository.search({ filters: { search: 'sousse' } });

    const { where } = prisma.client.findMany.mock.calls[0][0] as { where: { OR: unknown[] } };
    expect(JSON.stringify(where.OR)).toContain('displayName');
    expect(JSON.stringify(where.OR)).toContain('billingCity');
  });

  it('reads one by id, excluding a soft-deleted row', async () => {
    const { repository, prisma } = setup();

    const client = await repository.findById('client-1');

    expect(client?.billingAddress.city).toBe('Sousse');
    expect(prisma.client.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'client-1', deletedAt: null } }),
    );
  });

  it('answers null for an unknown id', async () => {
    const { repository, prisma } = setup();
    prisma.client.findUnique.mockResolvedValueOnce(null as never);

    expect(await repository.findById('nope')).toBeNull();
  });

  it('counts only current worksites against a client', async () => {
    const { repository, prisma } = setup();

    expect(await repository.countActiveWorksites('client-1')).toBe(3);
    expect(prisma.worksite.count).toHaveBeenCalledWith({
      where: { clientId: 'client-1', deletedAt: null },
    });
  });
});

describe('ClientRepository — save', () => {
  it('writes the client row first, inside one transaction, with its display name', async () => {
    const { repository, prisma, tx, calls } = setup();

    await repository.save(aClient([]));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(calls[0]).toBe('client.upsert');
    const { create } = tx.client.upsert.mock.calls[0][0] as { create: { displayName: string } };
    expect(create.displayName).toBe('Municipalité de Sousse');
  });

  it('deletes only this client’s contacts that were left out', async () => {
    const { repository, tx } = setup({ existingContactIds: ['keep'] });

    await repository.save(aClient([ClientContact.create({ id: 'keep', lastName: 'A' })]));

    expect(tx.clientContact.deleteMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', id: { notIn: ['keep'] } },
    });
  });

  it('updates a contact scoped by its client, and creates the ones that do not exist', async () => {
    const { repository, tx } = setup({ existingContactIds: ['keep'] });

    await repository.save(
      aClient([
        ClientContact.create({ id: 'keep', lastName: 'A' }),
        ClientContact.create({ id: 'new', lastName: 'B' }),
      ]),
    );

    expect(tx.clientContact.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'keep', clientId: 'client-1' } }),
    );
    expect(tx.clientContact.create).toHaveBeenCalledTimes(1);
    expect(tx.clientContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'new', clientId: 'client-1', lastName: 'B' }),
    });
  });

  it('returns what was read back, not what was sent', async () => {
    const { repository } = setup();

    const saved = await repository.save(aClient([]));

    // The double reads back a row with one contact.
    expect(saved.contacts).toHaveLength(1);
  });
});
