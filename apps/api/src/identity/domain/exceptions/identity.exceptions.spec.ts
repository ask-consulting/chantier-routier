import { PasswordRule } from '@chantia/shared';
import { describe, expect, it } from 'vitest';
import {
  AccountDisabledException,
  EmailAlreadyUsedException,
  InvalidCredentialsException,
  InvalidInvitationException,
  InvalidRefreshTokenException,
  LastAdminException,
  RegistrationClosedException,
  SelfTargetedActionException,
  WeakPasswordException,
} from './identity.exceptions';

/**
 * What `DomainExceptionFilter` answers is pinned next to the filter. What each
 * of these declares — its `kind` — is pinned here, because that is the half a
 * reader is most likely to "fix".
 */

describe('identity exceptions', () => {
  it.each([
    ['InvalidCredentials', new InvalidCredentialsException(), 'unauthenticated'],
    ['InvalidRefreshToken', new InvalidRefreshTokenException(), 'unauthenticated'],
    ['InvalidInvitation', new InvalidInvitationException(), 'unauthenticated'],
    ['AccountDisabled', new AccountDisabledException(), 'forbidden'],
    ['EmailAlreadyUsed', new EmailAlreadyUsedException('a@b.c'), 'conflict'],
    ['LastAdmin', new LastAdminException(), 'conflict'],
    ['SelfTargetedAction', new SelfTargetedActionException(), 'conflict'],
    ['WeakPassword', new WeakPasswordException([PasswordRule.DIGIT], 12), 'invalid-input'],
  ])('%s says %s', (_label, exception, kind) => {
    expect(exception.kind).toBe(kind);
  });

  /**
   * Registration is closed by design, and saying so answers the question the
   * caller is asking: does this deployment let anyone in? A 403 confirms the
   * route exists. The `not-found` kind — and a message shaped like Nest's own
   * for an undeclared route — is camouflage, not an oversight.
   *
   * Anyone changing this to `forbidden` because it "looks wrong" has to delete
   * this test to do it, which is the point.
   */
  it('hides that registration exists rather than forbidding it', () => {
    const exception = new RegistrationClosedException();

    expect(exception.kind).toBe('not-found');
    expect(exception.message).toBe('Cannot POST /auth/register');
  });

  describe('WeakPasswordException', () => {
    /**
     * The form marks every failing rule at once instead of revealing them one
     * per round-trip. `code` is an i18n key the client translates itself —
     * `use-invitation-form.ts` splits on the last dot, so the prefix is part of
     * the contract, not decoration.
     */
    it('reports every violation, in the shape the invitation form reads', () => {
      const exception = new WeakPasswordException(
        [PasswordRule.MIN_LENGTH, PasswordRule.UPPERCASE, PasswordRule.COMMON],
        12,
      );

      expect(exception.fieldErrors).toEqual([
        { field: 'password', code: 'form.errors.password.minLength', message: expect.any(String) },
        { field: 'password', code: 'form.errors.password.uppercase', message: expect.any(String) },
        { field: 'password', code: 'form.errors.password.common', message: expect.any(String) },
      ]);
    });

    it('names the minimum length it actually enforces', () => {
      const exception = new WeakPasswordException([PasswordRule.MIN_LENGTH], 12);

      expect(exception.fieldErrors?.[0].message).toContain('12');
    });

    it('has a message even when handed no violation at all', () => {
      const exception = new WeakPasswordException([], 12);

      expect(exception.message).toBe('Password does not meet the security policy');
      expect(exception.fieldErrors).toEqual([]);
    });

    it('covers every rule the policy can raise', () => {
      const all = Object.values(PasswordRule);

      const exception = new WeakPasswordException(all, 12);

      expect(exception.fieldErrors).toHaveLength(all.length);
      // A rule added to the enum without a message would land here as undefined.
      for (const error of exception.fieldErrors ?? []) {
        expect(error.message).toBeTruthy();
      }
    });
  });
});
