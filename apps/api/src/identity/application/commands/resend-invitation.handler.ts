import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { invitationStatusOf, isInvitationActionable } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import {
  INVITATION_REPOSITORY_PORT,
  InvitationRepositoryPort,
} from '../../domain/ports/invitation-repository.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { InvitationNotPendingException } from '../../domain/exceptions/identity.exceptions';
import { InvitationIssuer, IssuedInvitationLink } from '../services/invitation-issuer.service';
import { ResendInvitationCommand } from './resend-invitation.command';

/**
 * Sends the invitation again — as a **new link**, not a copy of the old one.
 *
 * The clear-text token was never stored, so the first mail cannot be reproduced
 * even in principle. That is not a limitation to work around: somebody asking
 * for a resend usually has a link that is about to lapse, and handing them the
 * same one back would solve nothing.
 *
 * Only a *pending* invitation can be resent. An accepted one has nothing left to
 * do; an expired one is a decision the admin should make deliberately — and for
 * that, re-inviting from the accounts screen is the honest path, because it says
 * so in the interface.
 */
@CommandHandler(ResendInvitationCommand)
export class ResendInvitationHandler implements ICommandHandler<ResendInvitationCommand> {
  constructor(
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
    private readonly invitationIssuer: InvitationIssuer,
  ) {}

  async execute(command: ResendInvitationCommand): Promise<IssuedInvitationLink> {
    const { invitationId, organizationId, requestedById } = command;

    const invitation = await this.invitations.findById(invitationId);
    if (!invitation) {
      throw new ResourceNotFoundException('Invitation', invitationId);
    }

    const user = await this.users.findById(invitation.userId);
    // The tenant check is here rather than in the repository because it is the
    // *use case* that must not cross the boundary: `invitations` carries no
    // organization of its own, so an id from another tenant would otherwise be
    // found perfectly well. A stranger's id reads as "not found", never as
    // "forbidden" — the second answer confirms the row exists.
    if (!user || user.organizationId !== organizationId) {
      throw new ResourceNotFoundException('Invitation', invitationId);
    }

    const status = invitationStatusOf(invitation);
    if (!isInvitationActionable(status)) {
      throw new InvitationNotPendingException(status);
    }

    // Issuing closes the current link before opening a new one, so the mail
    // already in somebody's inbox stops working the moment this succeeds. The
    // row is *rewritten* rather than duplicated: one person, one line, whatever
    // the number of attempts.
    return this.invitationIssuer.issueFor(user, requestedById, { replacing: invitation.id });
  }
}
