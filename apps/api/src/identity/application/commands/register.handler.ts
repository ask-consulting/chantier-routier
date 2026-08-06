import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { UserRole, checkPasswordPolicy } from '@chantia/shared';
import { IdentityConfig } from '../../config/identity.config';
import { Organization } from '../../domain/entities/organization.entity';
import { User } from '../../domain/entities/user.entity';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../../domain/ports/organization-repository.port';
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
import { IssuedSession, SessionIssuer } from '../services/session-issuer.service';
import { RegisterCommand } from './register.command';

/**
 * Creates the tenant, its owner account and a first session in one go.
 *
 * The first account is always an `admin`: a fresh organization with a non-admin
 * owner could never create its other accounts.
 */
@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  private readonly config: IdentityConfig;

  constructor(
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly organizations: OrganizationRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly sessionIssuer: SessionIssuer,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  async execute(command: RegisterCommand): Promise<IssuedSession> {
    const { data, userAgent } = command;

    const violations = checkPasswordPolicy(data.password, {
      minLength: this.config.minPasswordLength,
      // The four words an attacker targeting this sign-up would try first.
      forbiddenTerms: [data.email, data.firstName, data.lastName, data.organizationName],
    });
    if (violations.length > 0) {
      throw new WeakPasswordException(violations, this.config.minPasswordLength);
    }

    const email = User.normalizeEmail(data.email);
    // Friendly error for the common case; the unique index is what actually
    // settles two concurrent sign-ups on the same email.
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyUsedException(email);
    }

    const organization = Organization.create({
      id: randomUUID(),
      name: data.organizationName,
    });

    const owner = User.create({
      id: randomUUID(),
      organizationId: organization.id,
      email,
      passwordHash: await this.passwordHasher.hash(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      role: UserRole.ADMIN,
    });

    const created = await this.organizations.createWithOwner(organization, owner);

    return this.sessionIssuer.issueFor(created.owner, { userAgent });
  }
}
