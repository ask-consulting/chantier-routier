import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { SendNotificationCommand } from '@notification/application/commands/send-notification.command';
import { SendNotificationHandler } from '@notification/application/commands/send-notification.handler';
import {
  NotificationChannel,
  NotificationLocale,
  NotificationSubject,
} from '@notification/domain/notification.types';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { IdentityConfig } from '../../config/identity.config';
import { Invitation } from '../../domain/entities/invitation.entity';
import { User } from '../../domain/entities/user.entity';
import {
  INVITATION_REPOSITORY_PORT,
  InvitationRepositoryPort,
} from '../../domain/ports/invitation-repository.port';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../../domain/ports/organization-repository.port';
import { TOKEN_ISSUER_PORT, TokenIssuerPort } from '../../domain/ports/token-issuer.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { EmailAlreadyUsedException } from '../../domain/exceptions/identity.exceptions';
import { UserInvitedEvent } from '../events/user-invited.event';
import { InviteUserCommand } from './invite-user.command';

/** Where the invitee lands. Kept next to the handler that mints the link. */
export const INVITATION_PATH = '/invitation';

export interface IssuedInvitation {
  user: User;
  /** Shown once and never stored — the database holds only the hash. */
  invitationPath: string;
  expiresAt: Date;
}

/**
 * Creates an account without a password and issues the link that sets one.
 *
 * The admin never chooses their team's passwords, and never learns them: the
 * invitee sets their own. That is the whole point of doing this rather than
 * `POST /users { password }`.
 *
 * Delivery is asked for here, but never waited on. `executeDetached` returns
 * immediately and swallows its own failures into a log line, so a mail outage
 * cannot roll back an account creation — the property `docs/08-identity-module.md`
 * asks for, kept by the *shape of the call* rather than by an event bus.
 *
 * `UserInvitedEvent` is still published. It is now a fact about what happened,
 * not the delivery mechanism: nothing subscribes, and anything that wants to
 * later — an audit trail, an in-app feed — still can.
 *
 * **This handler imports a business module**, which the wall around `identity/`
 * otherwise forbids. It is a deliberate, temporary exception: the plan is a
 * `POST /notifications` on its own service, and on that day this import becomes
 * an HTTP client. See `apps/api/eslint.config.mjs` and `docs/14` §5.2.
 */
@CommandHandler(InviteUserCommand)
export class InviteUserHandler implements ICommandHandler<InviteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly organizations: OrganizationRepositoryPort,
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
    private readonly events: EventBus,
    private readonly notifications: SendNotificationHandler,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  private readonly config: IdentityConfig;

  async execute(command: InviteUserCommand): Promise<IssuedInvitation> {
    const { organizationId, data, invitedById } = command;

    const email = User.normalizeEmail(data.email);
    // Emails are unique across the whole product, not per tenant: an address
    // already taken elsewhere is refused here too, without saying where.
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyUsedException(email);
    }

    const organization = await this.organizations.findById(organizationId);
    if (!organization) {
      throw new ResourceNotFoundException('Organization', organizationId);
    }

    const user = await this.users.save(
      User.create({
        id: randomUUID(),
        organizationId,
        email,
        // No password: the account exists, carries a role, and cannot yet
        // authenticate. `canAuthenticate()` refuses it until acceptance.
        passwordHash: null,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        workerId: data.workerId,
        locale: data.locale,
      }),
    );

    // Any link already sent is cancelled first: re-inviting somebody must not
    // leave a forwarded old link alive next to the new one.
    await this.invitations.revokeOutstandingFor(user.id);

    const token = this.tokenIssuer.issueInvitationToken();
    await this.invitations.save(
      Invitation.issue({
        id: randomUUID(),
        userId: user.id,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        invitedById,
      }),
    );

    const invitationPath = `${INVITATION_PATH}/${token.token}`;

    this.events.publish(
      new UserInvitedEvent(
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.locale,
        organization.name,
        invitationPath,
        token.expiresAt,
        invitedById,
      ),
    );

    // Detached on purpose: the account exists whether or not the mail leaves.
    this.notifications.executeDetached(
      new SendNotificationCommand(
        NotificationSubject.INVITATION,
        NotificationChannel.EMAIL,
        user.locale as unknown as NotificationLocale,
        { email: user.email, name: user.fullName },
        {
          firstName: user.firstName,
          organizationName: organization.name,
          invitationUrl: `${this.config.webAppUrl}${invitationPath}`,
          expiresAt: token.expiresAt.toISOString().slice(0, 10),
        },
      ),
    );

    return { user, invitationPath, expiresAt: token.expiresAt };
  }
}
