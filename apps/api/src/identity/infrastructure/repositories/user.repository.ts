import { Injectable } from '@nestjs/common';
import { UserRole } from '@chantia/shared';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { buildPrismaSearchQuery } from '@shared/infrastructure/repositories/prisma-search.helper';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { User } from '../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { EmailAlreadyUsedException } from '../../domain/exceptions/identity.exceptions';
import { UserMapper } from '../mappers/user.mapper';
import { IdentityPrismaService } from '../persistence/identity-prisma.service';
import { isUniqueViolationOn } from '../persistence/prisma-error';

@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async search(params: SearchParams): Promise<SearchResult<User>> {
    const { skip, take, page } = getPrismaPagination(params);
    // No tenant clause here: the extension adds it to both queries below, and
    // it wins over anything a caller-supplied filter might try to say.
    const { where, orderBy } = buildPrismaSearchQuery(params, 'lastName', {
      searchableFields: ['firstName', 'lastName', 'email'],
    });

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy, skip, take }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => UserMapper.toDomain(row)),
      total,
      page,
      limit: take ?? total,
    };
  }

  async countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: { role: UserRole.ADMIN, active: true },
    });
  }

  async save(user: User): Promise<User> {
    const data = UserMapper.toPersistence(user);
    try {
      const row = await this.prisma.user.upsert({
        where: { id: user.id },
        create: data,
        update: data,
      });
      return UserMapper.toDomain(row);
    } catch (error) {
      if (isUniqueViolationOn(error, 'email')) {
        throw new EmailAlreadyUsedException(user.email);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
