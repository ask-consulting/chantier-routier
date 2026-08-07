import { Organization as PrismaOrganization, Prisma } from '@prisma/client';
import { Organization } from '../../domain/entities/organization.entity';

export class OrganizationMapper {
  static toDomain(row: PrismaOrganization): Organization {
    return Organization.create({
      id: row.id,
      name: row.name,
      currency: row.currency,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(organization: Organization): Prisma.OrganizationUncheckedCreateInput {
    return {
      id: organization.id,
      name: organization.name,
      currency: organization.currency,
    };
  }
}
