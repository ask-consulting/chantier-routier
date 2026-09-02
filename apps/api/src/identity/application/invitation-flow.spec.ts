import { describe, expect, it, vi } from 'vitest';
import { InvitationStatus } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { CancelInvitationCommand } from './commands/cancel-invitation.command';
import { CancelInvitationHandler } from './commands/cancel-invitation.handler';
import { ResendInvitationCommand } from './commands/resend-invitation.command';
import { ResendInvitationHandler } from './commands/resend-invitation.handler';
import { GetInvitationsQuery } from './queries/get-invitations.query';
import { GetInvitationsHandler } from './queries/get-invitations.handler';
import { Invitation } from '../domain/entities/invitation.entity';
import { User } from '../domain/entities/user.entity';
import { InvitationNotPendingException } from '../domain/exceptions/identity.exceptions';
import { InvitationRepositoryPort } from '../domain/ports/invitation-repository.port';
import { UserRepositoryPort } from '../domain/ports/user-repository.port';
import { InvitationIssuer } from './services/invitation-issuer.service';

/**
 * What an admin may do to an invitation, and — mostly — what they may not.
 *
 * The doubles are deliberately stupid. What is under test is the *order of the
 * checks* and the *shape of the refusals*, and a clever fake would end up
 * asserting itself.
 *
 * Two properties are worth more than the rest, because both are invisible in a
 * green interface:
 *
 *   1. An invitation belonging to another organization must read as **not
 *      found**, never as forbidden. `invitations` has no organization column of
 *      its own, so nothing in the database enforces this — only these handlers
 *      do, and a "forbidden" would confirm the row exists to somebody who
 *      guessed an id.
 *   2. A resend **closes** the previous link. Both the old and the new one being
 *      live at once is the failure that nobody notices, because the new one
 *      works.
 */

const ORG = 'org-1';
const OTHER_ORG = 'org-2';

const IN_A_WEEK = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000);

function invitee(organizationId = ORG): User {
  return User.create({
    id: 'user-1',
    organizationId,
    email: 'karim@exemple.fr',
    passwordHash: null,
    firstName: 'Karim',
    lastName: 'Benali',
  });
}

function pendingInvitation(): Invitation {
  return Invitation.issue({
    id: 'inv-1',
    userId: 'user-1',
    tokenHash: 'hash',
    expiresAt: IN_A_WEEK,
    invitedById: 'admin-1',
  });
}

function setup(options: { invitation?: Invitation | null; user?: User | null } = {}) {
  const revokeOutstandingFor = vi.fn(async () => {});
  const invitations = {
    findById: vi.fn(async () =>
      options.invitation === undefined ? pendingInvitation() : options.invitation,
    ),
    revokeOutstandingFor,
    search: vi.fn(async () => ({ items: [], total: 0, page: 1, limit: 20 })),
  } as unknown as InvitationRepositoryPort;

  const users = {
    findById: vi.fn(async () => (options.user === undefined ? invitee() : options.user)),
  } as unknown as UserRepositoryPort;

  const issueFor = vi.fn(async () => ({
    invitationPath: '/invitation/nouveau-jeton',
    expiresAt: IN_A_WEEK,
  }));
  const issuer = { issueFor } as unknown as InvitationIssuer;

  return {
    invitations,
    users,
    issueFor,
    revokeOutstandingFor,
    resend: new ResendInvitationHandler(invitations, users, issuer),
    cancel: new CancelInvitationHandler(invitations, users),
    list: new GetInvitationsHandler(invitations),
  };
}

describe('ResendInvitationHandler', () => {
  it('mints a new link for a pending invitation', async () => {
    const { resend, issueFor } = setup();

    const issued = await resend.execute(new ResendInvitationCommand('inv-1', ORG, 'admin-1'));

    expect(issued.invitationPath).toBe('/invitation/nouveau-jeton');
    // Recorded against the admin who asked, not the one who invited first — and
    // rewriting the same row, so the list keeps one line per person however
    // many times somebody presses the button.
    expect(issueFor).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), 'admin-1', {
      replacing: 'inv-1',
    });
  });

  it('refuses an invitation that belongs to another organization, as "not found"', async () => {
    const { resend, issueFor } = setup({ user: invitee(OTHER_ORG) });

    await expect(
      resend.execute(new ResendInvitationCommand('inv-1', ORG, 'admin-1')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(issueFor).not.toHaveBeenCalled();
  });

  it('refuses an unknown invitation', async () => {
    const { resend } = setup({ invitation: null });

    await expect(
      resend.execute(new ResendInvitationCommand('inv-1', ORG, 'admin-1')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('refuses an accepted invitation, and says which state it is in', async () => {
    const accepted = pendingInvitation().accept(new Date());
    const { resend, issueFor } = setup({ invitation: accepted });

    await expect(
      resend.execute(new ResendInvitationCommand('inv-1', ORG, 'admin-1')),
    ).rejects.toThrow(new RegExp(InvitationStatus.ACCEPTED));
    expect(issueFor).not.toHaveBeenCalled();
  });

  it('refuses an expired invitation — re-inviting is a deliberate act, not a retry', async () => {
    const expired = Invitation.issue({
      id: 'inv-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: YESTERDAY,
      invitedById: 'admin-1',
    });
    const { resend } = setup({ invitation: expired });

    await expect(
      resend.execute(new ResendInvitationCommand('inv-1', ORG, 'admin-1')),
    ).rejects.toBeInstanceOf(InvitationNotPendingException);
  });
});

describe('CancelInvitationHandler', () => {
  it('expires the outstanding link rather than deleting the row', async () => {
    const { cancel, revokeOutstandingFor } = setup();

    await cancel.execute(new CancelInvitationCommand('inv-1', ORG));

    // The audit trail survives; only the window closes.
    expect(revokeOutstandingFor).toHaveBeenCalledWith('user-1');
  });

  it('refuses another organization’s invitation, as "not found"', async () => {
    const { cancel, revokeOutstandingFor } = setup({ user: invitee(OTHER_ORG) });

    await expect(cancel.execute(new CancelInvitationCommand('inv-1', ORG))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
    expect(revokeOutstandingFor).not.toHaveBeenCalled();
  });

  it('refuses an accepted invitation instead of quietly reporting success', async () => {
    const { cancel, revokeOutstandingFor } = setup({
      invitation: pendingInvitation().accept(new Date()),
    });

    await expect(cancel.execute(new CancelInvitationCommand('inv-1', ORG))).rejects.toBeInstanceOf(
      InvitationNotPendingException,
    );
    expect(revokeOutstandingFor).not.toHaveBeenCalled();
  });

  it('refuses an invitation whose account has vanished', async () => {
    const { cancel } = setup({ user: null });

    await expect(cancel.execute(new CancelInvitationCommand('inv-1', ORG))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe('GetInvitationsHandler', () => {
  it('passes the caller’s organization down, so the tenant clause is never optional', async () => {
    const { list, invitations } = setup();

    await list.execute(
      new GetInvitationsQuery({ organizationId: ORG, search: 'karim', status: InvitationStatus.PENDING }),
    );

    expect(invitations.search).toHaveBeenCalledWith({
      organizationId: ORG,
      search: 'karim',
      status: InvitationStatus.PENDING,
    });
  });
});
