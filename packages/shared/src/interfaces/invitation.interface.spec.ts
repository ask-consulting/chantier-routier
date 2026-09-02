import { describe, expect, it } from 'vitest';
import {
  InvitationStatus,
  invitationStatusOf,
  isInvitationActionable,
} from './invitation.interface';

/**
 * The rule that decides what an admin is allowed to do to an invitation.
 *
 * It lives here because the API enforces it and the web draws a badge from it;
 * two implementations would eventually disagree, and the visible symptom would
 * be a "Renvoyer" button that answers 409.
 */

const NOW = new Date('2026-09-02T12:00:00Z');

describe('invitationStatusOf', () => {
  it('is accepted as soon as there is an acceptance date, expiry or not', () => {
    expect(
      invitationStatusOf({ acceptedAt: '2026-08-01T00:00:00Z', expiresAt: '2026-08-02T00:00:00Z' }, NOW),
    ).toBe(InvitationStatus.ACCEPTED);
  });

  it('is pending while the window is open', () => {
    expect(
      invitationStatusOf({ acceptedAt: null, expiresAt: '2026-09-09T12:00:00Z' }, NOW),
    ).toBe(InvitationStatus.PENDING);
  });

  it('is expired once the window has closed', () => {
    expect(
      invitationStatusOf({ acceptedAt: null, expiresAt: '2026-09-01T12:00:00Z' }, NOW),
    ).toBe(InvitationStatus.EXPIRED);
  });

  it('treats the exact instant of expiry as over', () => {
    expect(invitationStatusOf({ acceptedAt: null, expiresAt: NOW }, NOW)).toBe(
      InvitationStatus.EXPIRED,
    );
  });

  it('reads dates and strings alike, because one side has Date and the other JSON', () => {
    expect(
      invitationStatusOf({ acceptedAt: null, expiresAt: new Date('2026-09-09T12:00:00Z') }, NOW),
    ).toBe(InvitationStatus.PENDING);
  });
});

describe('isInvitationActionable', () => {
  it('allows acting only on a pending invitation', () => {
    expect(isInvitationActionable(InvitationStatus.PENDING)).toBe(true);
    expect(isInvitationActionable(InvitationStatus.ACCEPTED)).toBe(false);
    expect(isInvitationActionable(InvitationStatus.EXPIRED)).toBe(false);
  });
});
