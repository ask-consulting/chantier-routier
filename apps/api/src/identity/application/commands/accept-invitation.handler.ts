import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { checkPasswordPolicy } from '@chantia/shared';
import { IdentityConfig } from '../../config/identity.config';
import {
  INVITATION_REPOSITORY_PORT,
  InvitationRepositoryPort,
} from '../../domain/ports/invitation-repository.port';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '../../domain/ports/password-hasher.port';
import { TOKEN_ISSUER_PORT, TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import {
  AccountDisabledException,
  InvalidInvitationException,
  WeakPasswordException,
} from '../../domain/exceptions/identity.exceptions';
import { IssuedSession, SessionIssuer } from '../services/session-issuer.service';
import { AcceptInvitationCommand } from './accept-invitation.command';

/**
 * Turns an invitation into a working account, and signs the person straight in.
 *
 * Signing in immediately is deliberate: somebody who has just chosen a password
 * should not be asked to type it again on a login form. It also means the link
 * can only ever be used once in practice, not just in principle.
 */
@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand> {
  private readonly config: IdentityConfig;

  constructor(
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
    private readonly sessionIssuer: SessionIssuer,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  async execute(command: AcceptInvitationCommand): Promise<IssuedSession> {
    const invitation = await this.invitations.findByTokenHash(
      this.tokenIssuer.hashToken(command.token),
    );

    // Unknown, already used and expired are one single answer: distinguishing
    // them would turn the endpoint into an oracle for guessing tokens.
    if (!invitation?.isUsable()) {
      throw new InvalidInvitationException();
    }

    const user = await this.users.findById(invitation.userId);
    if (!user) {
      throw new InvalidInvitationException();
    }
    if (!user.active) {
      throw new AccountDisabledException();
    }

    const violations = checkPasswordPolicy(command.password, {
      minLength: this.config.minPasswordLength,
      forbiddenTerms: [user.email, user.firstName, user.lastName],
    });
    if (violations.length > 0) {
      throw new WeakPasswordException(violations, this.config.minPasswordLength);
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const activated = await this.users.save(
      user.withPasswordHash(passwordHash).withLastLoginAt(new Date()),
    );

    // Burned only once the password is in: a failure above must leave the link
    // usable, or an invitee mistyping their password would be locked out.
    await this.invitations.save(invitation.accept());

    return this.sessionIssuer.issueFor(activated, { userAgent: command.userAgent });
  }
}
