import { InvitationStatus } from '@chantia/shared';
import type { Tone } from '@/shared/ui';

/**
 * How an invitation reads on screen.
 *
 * The **tone** lives here; the **label** lives in `messages/*.json` under
 * `invitationStatus.*`. Same split as `worksite-display.ts`, for the same
 * reason: a colour is a design decision, a wording is a translation, and mixing
 * them means a translator opens a `.ts` file.
 */
export const INVITATION_STATUS_TONE: Record<InvitationStatus, Tone> = {
  // Waiting on somebody, and the only row with buttons.
  [InvitationStatus.PENDING]: 'info',
  // Done. Green because nothing more is expected of anyone.
  [InvitationStatus.ACCEPTED]: 'success',
  // Not a failure and not an error — a window that closed. `neutral`, not
  // `danger`: an expired invitation from three months ago is history, and a
  // screen full of red would say something untrue about it.
  [InvitationStatus.EXPIRED]: 'neutral',
};

/**
 * The order the status filter offers, and the order the list defaults to.
 *
 * Pending first because it is the only actionable state — somebody opening this
 * screen is almost always looking for "who has not joined yet". The API sorts
 * the rows the same way, in SQL; this is the same intent spelled for the filter.
 */
export const INVITATION_STATUS_ORDER: readonly InvitationStatus[] = [
  InvitationStatus.PENDING,
  InvitationStatus.EXPIRED,
  InvitationStatus.ACCEPTED,
];
