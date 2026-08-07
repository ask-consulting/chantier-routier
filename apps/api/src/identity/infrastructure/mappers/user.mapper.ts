import { Prisma, User as PrismaUser } from '@prisma/client';
import { UserRole } from '@chantia/shared';
import { User } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(row: PrismaUser): User {
    return User.create({
      id: row.id,
      organizationId: row.organizationId,
      email: row.email,
      passwordHash: row.passwordHash,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as UserRole,
      active: row.active,
      workerId: row.workerId,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(user: User): Prisma.UserUncheckedCreateInput {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      workerId: user.workerId,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
