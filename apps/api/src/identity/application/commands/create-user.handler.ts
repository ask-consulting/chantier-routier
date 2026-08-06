import { checkPasswordPolicy } from '@chantia/shared';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { IdentityConfig } from '../../config/identity.config';
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
  EmailAlreadyUsedException,
  WeakPasswordException,
} from '../../infrastructure/exceptions/identity.exceptions';
import { CreateUserCommand } from './create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  private readonly config: IdentityConfig;

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  async execute(command: CreateUserCommand): Promise<User> {
    const { organizationId, data } = command;

    const violations = checkPasswordPolicy(data.password, {
      minLength: this.config.minPasswordLength,
      // The organisation name is left out: fetching it would cost a read on
      // every account creation, and the blocklist already carries the trade's
      // obvious words.
      forbiddenTerms: [data.email, data.firstName, data.lastName],
    });
    if (violations.length > 0) {
      throw new WeakPasswordException(violations, this.config.minPasswordLength);
    }

    const email = User.normalizeEmail(data.email);
    // Emails are unique across the whole product, not per tenant: an address
    // already taken elsewhere is refused here too, without saying where.
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyUsedException(email);
    }

    // `organizationId` comes from the caller's token, never from the payload:
    // an admin cannot plant an account in someone else's tenant.
    const user = User.create({
      id: randomUUID(),
      organizationId,
      email,
      passwordHash: await this.passwordHasher.hash(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      workerId: data.workerId,
    });

    return this.users.save(user);
  }
}
