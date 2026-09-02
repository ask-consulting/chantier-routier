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
import { CancelInvitationCommand } from './cancel-invitation.command';

/**
 * Cancels an invitation by **expiring it now**, and keeps the row.
 *
 * "Supprimer" in the interface, expiry in the database, and the difference
 * matters twice:
 *
 *   - The link in somebody's inbox stops working immediately — which is the
 *     point of the button, and a deleted row would achieve that too.
 *   - The trail of who invited whom, when, and that it was called off survives.
 *     An account created by mistake and cancelled is exactly the history an
 *     admin will want to read back in three months.
 *
 * The account itself is untouched: it exists, it has no password, and it cannot
 * authenticate. Deleting the person is a different decision, with its own button
 * on the accounts screen and its own confirmation.
 */
@CommandHandler(CancelInvitationCommand)
export class CancelInvitationHandler implements ICommandHandler<CancelInvitationCommand> {
  constructor(
    @Inject(INVITATION_REPOSITORY_PORT)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async execute(command: CancelInvitationCommand): Promise<void> {
    const { invitationId, organizationId } = command;

    const invitation = await this.invitations.findById(invitationId);
    if (!invitation) {
      throw new ResourceNotFoundException('Invitation', invitationId);
    }

    const user = await this.users.findById(invitation.userId);
    // Same reasoning as the resend: `invitations` carries no organization, so
    // the boundary is checked here, and a stranger's id reads as "not found".
    if (!user || user.organizationId !== organizationId) {
      throw new ResourceNotFoundException('Invitation', invitationId);
    }

    const status = invitationStatusOf(invitation);
    if (!isInvitationActionable(status)) {
      // Cancelling an already-expired invitation would be harmless, and it is
      // still refused: the button is offered on pending rows only, so reaching
      // this means the screen and the server disagree — and the honest answer to
      // that is to say so rather than to quietly do nothing and report success.
      throw new InvitationNotPendingException(status);
    }

    await this.invitations.revokeOutstandingFor(invitation.userId);
  }
}
