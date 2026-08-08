import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IInvitationPreview } from '@chantia/shared';
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
import { InvalidInvitationException } from '../../infrastructure/exceptions/identity.exceptions';
import { GetInvitationQuery } from './get-invitation.query';

/**
 * What the invitation page shows before asking for a password.
 *
 * Public — the token *is* the credential. Which is why it returns the invitee's
 * own name and organisation and nothing else: whoever holds the link already
 * knows who they are, and anything more would leak on a forwarded message.
 */
@QueryHandler(GetInvitationQuery)
export class GetInvitationHandler implements IQueryHandler<GetInvitationQuery> {
  constructor(
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly organizations: OrganizationRepositoryPort,
    @Inject(TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: TokenIssuerPort,
  ) {}

  async execute(query: GetInvitationQuery): Promise<IInvitationPreview> {
    const invitation = await this.invitations.findByTokenHash(
      this.tokenIssuer.hashToken(query.token),
    );
    if (!invitation?.isUsable()) {
      throw new InvalidInvitationException();
    }

    const user = await this.users.findById(invitation.userId);
    if (!user || !user.active) {
      throw new InvalidInvitationException();
    }

    const organization = await this.organizations.findById(user.organizationId);

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      organizationName: organization?.name ?? '',
    };
  }
}
