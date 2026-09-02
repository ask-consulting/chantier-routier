import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { User } from '../../domain/entities/user.entity';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../../domain/ports/organization-repository.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { EmailAlreadyUsedException } from '../../domain/exceptions/identity.exceptions';
import { InvitationIssuer } from '../services/invitation-issuer.service';
import { UserInvitedEvent } from '../events/user-invited.event';
import { InviteUserCommand } from './invite-user.command';

export { INVITATION_PATH } from '../services/invitation-issuer.service';

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
 * The link itself is minted by `InvitationIssuer`, shared with the resend
 * command — cancelling what is outstanding, storing only a hash and sending the
 * mail are the same four steps whichever door you came through.
 *
 * `UserInvitedEvent` stays here rather than moving into the issuer: it says *a
 * person was invited*, which happens once. A resend mints a second link and
 * invites nobody new.
 */
@CommandHandler(InviteUserCommand)
export class InviteUserHandler implements ICommandHandler<InviteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    @Inject(ORGANIZATION_REPOSITORY_PORT)
    private readonly organizations: OrganizationRepositoryPort,
    private readonly invitationIssuer: InvitationIssuer,
    private readonly events: EventBus,
  ) {}

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

    const { invitationPath, expiresAt } = await this.invitationIssuer.issueFor(user, invitedById);

    this.events.publish(
      new UserInvitedEvent(
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.locale,
        organization.name,
        invitationPath,
        expiresAt,
        invitedById,
      ),
    );

    return { user, invitationPath, expiresAt };
  }
}
