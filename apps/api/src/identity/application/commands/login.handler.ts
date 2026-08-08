import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { User } from '../../domain/entities/user.entity';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import {
  AccountDisabledException,
  InvalidCredentialsException,
} from '../../infrastructure/exceptions/identity.exceptions';
import { IssuedSession, SessionIssuer } from '../services/session-issuer.service';
import { LoginCommand } from './login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<IssuedSession> {
    const { data, userAgent } = command;
    const email = User.normalizeEmail(data.email);

    const user = await this.users.findByEmail(email);
    // An invited account that has never accepted is treated exactly like an
    // unknown email — same error, same cost. Saying "this account exists but has
    // not set a password yet" would confirm the address to anyone probing.
    if (!user?.passwordHash) {
      // Burn the same CPU a real verification would: returning immediately here
      // makes "unknown email" measurably faster than "wrong password", which is
      // all an attacker needs to harvest valid addresses.
      await this.passwordHasher.simulateVerify();
      throw new InvalidCredentialsException();
    }

    if (!(await this.passwordHasher.verify(data.password, user.passwordHash))) {
      throw new InvalidCredentialsException();
    }

    // Checked *after* the password, so a disabled account is only revealed to
    // someone who already knows its credentials.
    if (!user.canAuthenticate()) {
      throw new AccountDisabledException();
    }

    const authenticated = await this.users.save(user.withLastLoginAt(new Date()));

    return this.sessionIssuer.issueFor(authenticated, { userAgent });
  }
}
