import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { User } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { UpdatePreferencesCommand } from './update-preferences.command';

/**
 * A user setting their own interface language.
 *
 * Separate from `UpdateUser`, which is an admin action guarded by
 * `user:manage`: choosing your own language is not an administrative act, and
 * every account may do it for itself.
 *
 * Stored on the account rather than in a cookie so it follows the person from
 * the office desktop to the phone on site.
 */
@CommandHandler(UpdatePreferencesCommand)
export class UpdatePreferencesHandler implements ICommandHandler<UpdatePreferencesCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<User> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new ResourceNotFoundException('User', command.userId);
    }
    return this.users.save(user.withLocale(command.locale));
  }
}
