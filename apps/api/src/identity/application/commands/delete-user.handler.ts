import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRole } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/infrastructure/exceptions/not-found.exception';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import {
  LastAdminException,
  SelfTargetedActionException,
} from '../../infrastructure/exceptions/identity.exceptions';
import { DeleteUserCommand } from './delete-user.command';

/**
 * Hard delete. Refresh tokens go with it through the foreign key cascade, so
 * the account's live sessions die with the row.
 *
 * Deactivating (`active: false`) is the reversible alternative, and the right
 * one when the person's field data must keep an author.
 */
@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const { organizationId, userId, actorId } = command;

    if (userId === actorId) {
      throw new SelfTargetedActionException('delete');
    }

    const user = await this.users.findById(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new ResourceNotFoundException('User', userId);
    }

    if (
      user.role === UserRole.ADMIN &&
      user.active &&
      (await this.users.countActiveAdmins(organizationId)) <= 1
    ) {
      throw new LastAdminException();
    }

    await this.users.delete(userId);
  }
}
