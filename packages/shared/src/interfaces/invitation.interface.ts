/**
 * Where an invitation stands, as one word.
 *
 * Derived, never stored: the row holds `acceptedAt` and `expiresAt`, and the
 * status is what those two say together at the moment somebody looks. A column
 * would need a job to keep it true, and would be wrong between two runs of it.
 */
export enum InvitationStatus {
  /** Sent, not yet accepted, still within its window. The only actionable one. */
  PENDING = 'pending',
  /** Used. The account has a password and can sign in. */
  ACCEPTED = 'accepted',
  /** Past its expiry, or cancelled — cancelling *is* expiring it now. */
  EXPIRED = 'expired',
}

/**
 * One line of the invitations screen.
 *
 * It carries the invitee's identity, which the `invitations` row does not: the
 * screen lists people, not tokens. Assembled server-side rather than by two
 * calls from the browser, because filtering by name has to happen where the
 * rows are.
 */
export interface IInvitationListItem {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  /** The admin who sent it. */
  invitedById: string;
  /**
   * Their name, resolved server-side — `null` when the account that invited has
   * since been deleted. The invitation outlives the person who sent it, and the
   * screen has to say so rather than show an empty cell that reads as a bug.
   */
  invitedByName: string | null;
}

/**
 * The status of an invitation, from the only two facts that decide it.
 *
 * Here rather than in the API because the web draws the same badge from the
 * same rule, and two implementations of "is this still usable" would eventually
 * disagree — the API refusing a resend the interface still offers.
 */
export function invitationStatusOf(
  invitation: { acceptedAt: Date | string | null; expiresAt: Date | string },
  now: Date = new Date(),
): InvitationStatus {
  if (invitation.acceptedAt !== null) {
    return InvitationStatus.ACCEPTED;
  }

  const expiresAt = new Date(invitation.expiresAt);
  // `<=`, not `<`: an invitation that expires exactly now is over. The boundary
  // has to fall on the same side in both directions, or a link accepted at the
  // millisecond of expiry would work here and be refused server-side.
  return expiresAt.getTime() <= now.getTime()
    ? InvitationStatus.EXPIRED
    : InvitationStatus.PENDING;
}

/** Only a pending invitation can be resent or cancelled. */
export function isInvitationActionable(status: InvitationStatus): boolean {
  return status === InvitationStatus.PENDING;
}
