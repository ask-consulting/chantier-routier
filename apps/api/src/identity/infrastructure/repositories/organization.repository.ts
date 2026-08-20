import { Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity';
import { User } from '../../domain/entities/user.entity';
import { OrganizationRepositoryPort } from '../../domain/ports/organization-repository.port';
import { EmailAlreadyUsedException } from '../../domain/exceptions/identity.exceptions';
import { OrganizationMapper } from '../mappers/organization.mapper';
import { UserMapper } from '../mappers/user.mapper';
import { IdentityPrismaService } from '../persistence/identity-prisma.service';
import { isUniqueViolationOn } from '../persistence/prisma-error';

@Injectable()
export class OrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    const row = await this.prisma.organization.findUnique({ where: { id } });
    return row ? OrganizationMapper.toDomain(row) : null;
  }

  async save(organization: Organization): Promise<Organization> {
    const data = OrganizationMapper.toPersistence(organization);
    const row = await this.prisma.organization.upsert({
      where: { id: organization.id },
      create: data,
      update: data,
    });
    return OrganizationMapper.toDomain(row);
  }

  async createWithOwner(
    organization: Organization,
    owner: User,
  ): Promise<{ organization: Organization; owner: User }> {
    try {
      return await this.prisma.transaction(async (tx) => {
        const organizationRow = await tx.organization.create({
          data: OrganizationMapper.toPersistence(organization),
        });
        const ownerRow = await tx.user.create({
          data: UserMapper.toPersistence(owner),
        });

        return {
          organization: OrganizationMapper.toDomain(organizationRow),
          owner: UserMapper.toDomain(ownerRow),
        };
      });
    } catch (error) {
      if (isUniqueViolationOn(error, 'email')) {
        throw new EmailAlreadyUsedException(owner.email);
      }
      throw error;
    }
  }
}
