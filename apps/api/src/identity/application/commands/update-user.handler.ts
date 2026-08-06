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
    const { userId, data, actorId } = command;

    // Tenant-scoped by the Prisma layer, so an account of another organization
    // is reported as missing rather than forbidden — "403" would confirm that
    // the id exists somewhere.
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const isDeactivated = data.active === false;
    /** The target ends up without the admin role — demoted, whatever it held before. */
    const losesAdmin = data.role !== undefined && data.role !== UserRole.ADMIN;
    /** Any self-inflicted role change, in either direction. Resending the same role is a no-op. */
    const changesOwnRole = data.role !== undefined && data.role !== user.role;

    // Nobody edits their own role, not even upwards. Phrasing this as "cannot
    // demote yourself" would only hold while `USER_MANAGE` belongs to admins
    // alone: granting it to another role would silently turn this route into
    // self-promotion. The rule must not depend on the permission matrix.
    if (userId === actorId && (isDeactivated || changesOwnRole)) {
      throw new SelfTargetedActionException(
        isDeactivated ? 'deactivate' : 'change the role of',
      );
    }

    if (user.role === UserRole.ADMIN && user.active && (losesAdmin || isDeactivated)) {
      // Losing the last admin would leave the organization with nobody able to
      // create accounts or restore access. The count is scoped to the caller's
      // organization like every other query.
      if ((await this.users.countActiveAdmins()) <= 1) {
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
