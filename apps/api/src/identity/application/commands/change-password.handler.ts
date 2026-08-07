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
  AccountDisabledException,
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

    // Unreachable today, and kept anyway. Every path that issues an access token
    // requires a password — login and refresh both go through
    // `canAuthenticate()`, register and accept-invitation set one first — and
    // `withPasswordHash` cannot take null, so a hash never goes from set back to
    // absent. But the field *is* nullable, so the compiler asks; answering with
    // a non-null assertion would turn a future regression into a crash instead
    // of a 401. Failing closed costs one line.
    if (!user.passwordHash) {
      throw new InvalidCredentialsException();
    }

    // Re-proving the current password is what stops a borrowed session (an
    // unlocked laptop, a stolen access token) from taking over the account.
    if (!(await this.passwordHasher.verify(data.currentPassword, user.passwordHash))) {
      throw new InvalidCredentialsException();
    }

    // A deactivated account keeps a valid access token until it expires — the
    // documented cost of a stateless guard (docs/08 §3). Within that window it
    // could otherwise change its own credentials, and an admin re-enabling the
    // account later would not know the password had moved. Login and
    // accept-invitation already refuse here; this was the odd one out.
    //
    // Checked *after* the password, like login: a disabled account is only
    // revealed to somebody who already knows its credentials.
    if (!user.active) {
      throw new AccountDisabledException();
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
