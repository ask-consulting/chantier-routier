import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/infrastructure/exceptions/not-found.exception';
import { User } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { GetUserByIdQuery } from './get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<User> {
    const user = await this.users.findById(query.userId);
    if (!user || user.organizationId !== query.organizationId) {
      throw new ResourceNotFoundException('User', query.userId);
    }
    return user;
  }
}
