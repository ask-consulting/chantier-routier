import { checkPasswordPolicy } from '@chantia/shared';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IdentityConfig } from '../../config/identity.config';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '../../domain/ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY_PORT,
  RefreshTokenRepositoryPort,
} from '../../domain/ports/refresh-token-repository.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import {
  InvalidCredentialsException,
  WeakPasswordException,
} from '../../infrastructure/exceptions/identity.exceptions';
import { ChangePasswordCommand } from './change-password.command';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  private readonly config: IdentityConfig;

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_PORT)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  async execute(command: ChangePasswordCommand): Promise<void> {
    const { userId, data } = command;

    const user = await this.users.findById(userId);
    // The caller holds a valid access token, so a missing user means the account
    // was deleted mid-session: same answer as a wrong password.
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Re-proving the current password is what stops a borrowed session (an
    // unlocked laptop, a stolen access token) from taking over the account.
    if (!(await this.passwordHasher.verify(data.currentPassword, user.passwordHash))) {
      throw new InvalidCredentialsException();
    }

    const violations = checkPasswordPolicy(data.newPassword, {
      minLength: this.config.minPasswordLength,
      forbiddenTerms: [user.email, user.firstName, user.lastName],
    });
    if (violations.length > 0) {
      throw new WeakPasswordException(violations, this.config.minPasswordLength);
    }

    const passwordHash = await this.passwordHasher.hash(data.newPassword);
    await this.users.save(user.withPasswordHash(passwordHash));

    // The usual reason to change a password is that it may be compromised, so
    // every session goes — including this one. The client logs in again.
    await this.refreshTokens.revokeAllForUser(userId);
  }
}
