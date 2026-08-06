import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRole } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/infrastructure/exceptions/not-found.exception';
import { User } from '../../domain/entities/user.entity';
import {
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenRepositoryPort,
} from '../../domain/ports/refresh-token-repository.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import {
  LastAdminException,
  SelfTargetedActionException,
} from '../../infrastructure/exceptions/identity.exceptions';
import { UpdateUserCommand } from './update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    const { organizationId, userId, data, actorId } = command;

    const user = await this.users.findById(userId);
    // A user of another tenant is reported as missing rather than forbidden:
    // "403" would confirm that the id exists somewhere.
    if (!user || user.organizationId !== organizationId) {
      throw new ResourceNotFoundException('User', userId);
    }

    const losesAdmin = data.role !== undefined && data.role !== UserRole.ADMIN;
    const isDeactivated = data.active === false;

    if (userId === actorId && (isDeactivated || losesAdmin)) {
      throw new SelfTargetedActionException(isDeactivated ? 'deactivate' : 'demote');
    }

    if (user.role === UserRole.ADMIN && user.active && (losesAdmin || isDeactivated)) {
      // Losing the last admin would leave the organization with nobody able to
      // create accounts or restore access.
      if ((await this.users.countActiveAdmins(organizationId)) <= 1) {
        throw new LastAdminException();
      }
    }

    const updated = await this.users.save(user.withProfile(data));

    // Access tokens live on until they expire, but cutting the refresh tokens
    // bounds a deactivated account's remaining access to a few minutes.
    if (isDeactivated) {
      await this.refreshTokens.revokeAllForUser(userId);
    }

    return updated;
  }
}
