import { Inject, Injectable } from '@nestjs/common';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { buildPrismaSearchQuery } from '@shared/infrastructure/repositories/prisma-search.helper';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Client } from '../../domain/entities/client.entity';
import { ClientRepositoryPort } from '../../domain/ports/client-repository.port';
import { ClientMapper } from '../mappers/client.mapper';

/** Primary contact first, then in the order they were added. */
const WITH_CONTACTS = {
  contacts: { orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }] },
};

@Injectable()
export class ClientRepository implements ClientRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async search(params: SearchParams): Promise<SearchResult<Client>> {
    const { skip, take, page } = getPrismaPagination(params);
    // No tenant clause: the extension adds it. Sorted by the one name every
    // client has, whatever its type — which is what `displayName` is for.
    const { where, orderBy } = buildPrismaSearchQuery(params, 'displayName', {
      searchableFields: ['displayName', 'billingCity'],
    });
    const notDeleted = { ...where, deletedAt: null };

    const [rows, total] = await Promise.all([
      this.prisma.client.findMany({ where: notDeleted, orderBy, skip, take, include: WITH_CONTACTS }),
      this.prisma.client.count({ where: notDeleted }),
    ]);

    return {
      items: rows.map((row) => ClientMapper.toDomain(row)),
      total,
      page,
      limit: take ?? total,
    };
  }

  async findById(id: string): Promise<Client | null> {
    const row = await this.prisma.client.findUnique({
      where: { id, deletedAt: null },
      include: WITH_CONTACTS,
    });
    return row ? ClientMapper.toDomain(row) : null;
  }

  async save(client: Client): Promise<Client> {
    const data = ClientMapper.toPersistence(client);
    const keep = client.contacts.map((contact) => contact.id);

    return this.prisma.$transaction(async (tx) => {
      // The client row first, through the tenant filter: an id belonging to
      // another organization is not matched here, and its insert then fails
      // on the primary key — so the contact writes below only ever run for a
      // client of the caller's own organization.
      await tx.client.upsert({ where: { id: client.id }, create: data, update: data });

      await tx.clientContact.deleteMany({ where: { clientId: client.id, id: { notIn: keep } } });

      for (const contact of client.contacts) {
        const row = ClientMapper.contactToPersistence(contact);
        // `updateMany` on `{ id, clientId }` rather than `update` on `id`: a
        // contact row carries no tenant, so the client id is what scopes it.
        const { count } = await tx.clientContact.updateMany({
          where: { id: contact.id, clientId: client.id },
          data: row,
        });
        if (count === 0) {
          await tx.clientContact.create({ data: { ...row, clientId: client.id } });
        }
      }

      const saved = await tx.client.findUniqueOrThrow({
        where: { id: client.id },
        include: WITH_CONTACTS,
      });
      return ClientMapper.toDomain(saved);
    });
  }

  async countActiveWorksites(clientId: string): Promise<number> {
    return this.prisma.worksite.count({ where: { clientId, deletedAt: null } });
  }
}
