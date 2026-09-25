import { Client as PrismaClient, ClientContact as PrismaContact, Prisma } from '@prisma/client';
import { ClientType } from '@chantia/shared';
import { ClientContact } from '../../domain/entities/client-contact.entity';
import { Client } from '../../domain/entities/client.entity';

export type ClientRow = PrismaClient & { contacts: PrismaContact[] };

export class ClientMapper {
  static toDomain(row: ClientRow): Client {
    return Client.create({
      id: row.id,
      organizationId: row.organizationId,
      type: row.type as ClientType,
      firstName: row.firstName,
      lastName: row.lastName,
      legalName: row.legalName,
      billingAddress: {
        line1: row.billingLine1,
        line2: row.billingLine2,
        postalCode: row.billingPostalCode,
        city: row.billingCity,
        country: row.billingCountry,
      },
      contacts: row.contacts.map((contact) => ClientMapper.contactToDomain(contact)),
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static contactToDomain(row: PrismaContact): ClientContact {
    return ClientContact.create({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      position: row.position,
      mobilePhone: row.mobilePhone,
      landlinePhone: row.landlinePhone,
      email: row.email,
      isPrimary: row.isPrimary,
    });
  }

  /** The client row alone — contacts are written by the repository, one by one. */
  static toPersistence(client: Client): Prisma.ClientUncheckedCreateInput {
    return {
      id: client.id,
      organizationId: client.organizationId,
      type: client.type,
      firstName: client.firstName,
      lastName: client.lastName,
      legalName: client.legalName,
      displayName: client.displayName,
      billingLine1: client.billingAddress.line1,
      billingLine2: client.billingAddress.line2,
      billingPostalCode: client.billingAddress.postalCode,
      billingCity: client.billingAddress.city,
      billingCountry: client.billingAddress.country,
      deletedAt: client.deletedAt,
    };
  }

  static contactToPersistence(
    contact: ClientContact,
  ): Omit<Prisma.ClientContactUncheckedCreateInput, 'clientId'> {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      position: contact.position,
      mobilePhone: contact.mobilePhone,
      landlinePhone: contact.landlinePhone,
      email: contact.email,
      isPrimary: contact.isPrimary,
    };
  }
}
