import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

/** Where the invitee lands. Kept next to the code that mints the link. */
export const INVITATION_PATH = '/invitation';

export interface IssuedInvitationLink {
  /** Shown once and never stored — the database holds only the hash. */
  invitationPath: string;
  expiresAt: Date;
}

export interface IssueOptions {
  /**
   * Refresh this invitation instead of opening a second one.
   *
   * A resend passes it, an invitation does not. Without it, the screen would
   * grow a line per attempt: the same person three times, twice in grey, which
   * says nothing an admin wants to know and buries the row that matters.
   */
  replacing?: string;
}

/**
 * The one place an invitation link comes into existence.
 *
 * Inviting somebody and resending their invitation differ entirely in *why* and
 * not at all in *what happens*: cancel whatever is outstanding, mint a token,
 * store its hash, send the mail. Two copies of that would drift — and the first
 * thing to drift would be the cancellation, leaving a forwarded old link alive
 * next to the new one. Same reason `SessionIssuer` exists.
 *
 * **A resend is a new link, not a re-sent one.** The clear-text token is not
 * kept anywhere, so the previous mail cannot be reproduced even in principle;
 * and it should not be, because a link whose window is nearly closed is exactly
 * what somebody asking for a resend is complaining about.
 *
 * **This service imports a business module**, which the wall around `identity/`
 * otherwise forbids. It is the deliberate, temporary exception documented in
 * `apps/api/eslint.config.mjs` and `docs/14` §5.2 — and it is now one file
 * instead of one handler, which is what keeps the exception from spreading.
 */
@Injectable()
export class InvitationIssuer {
  constructor(
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly organizations: OrganizationRepositoryPort,
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
    private readonly notifications: SendNotificationHandler,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<IdentityConfig>('identity');
  }

  private readonly config: IdentityConfig;

  async issueFor(
    user: User,
    invitedById: string,
    options: IssueOptions = {},
  ): Promise<IssuedInvitationLink> {
    const organization = await this.organizations.findById(user.organizationId);
    if (!organization) {
      throw new ResourceNotFoundException('Organization', user.organizationId);
    }

    // Any link already sent is closed first: re-inviting or resending must not
    // leave a forwarded old link alive next to the new one. When resending, this
    // closes the very row about to be rewritten — harmless, and it means the
    // rule holds whichever door we came through.
    await this.invitations.revokeOutstandingFor(user.id);

    const token = this.tokenIssuer.issueInvitationToken();
    await this.invitations.save(
      Invitation.issue({
        // The same row when resending, so the list keeps one line per person —
        // and the line keeps its `createdAt`, which is the date somebody was
        // first invited rather than the date of the latest attempt.
        id: options.replacing ?? randomUUID(),
        userId: user.id,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        invitedById,
      }),
    );

    const invitationPath = `${INVITATION_PATH}/${token.token}`;

    // Detached on purpose: the account exists whether or not the mail leaves,
    // and a resend that fails must say so in the log rather than roll anything
    // back. See docs/14 §5.1.
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

    return { invitationPath, expiresAt: token.expiresAt };
  }
}
