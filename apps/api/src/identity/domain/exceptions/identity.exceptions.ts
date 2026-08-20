import { PasswordRule } from '@chantia/shared';
import { DomainErrorKind, DomainException } from '@shared/domain/domain.exception';

/**
 * Wrong email *or* wrong password — deliberately the same error for both.
 * Distinguishing them turns the login endpoint into an account-enumeration
 * oracle.
 */
export class InvalidCredentialsException extends DomainException {
  readonly kind: DomainErrorKind = 'unauthenticated';

  constructor() {
    super('Invalid email or password');
  }
}

/** Credentials were valid but the account has been deactivated. */
export class AccountDisabledException extends DomainException {
  readonly kind: DomainErrorKind = 'forbidden';

  constructor() {
    super('This account has been deactivated');
  }
}

export class EmailAlreadyUsedException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(email: string) {
    super(`An account already exists for ${email}`);
  }
}

/** Refresh token unknown, expired, already rotated, or revoked. */
export class InvalidRefreshTokenException extends DomainException {
  readonly kind: DomainErrorKind = 'unauthenticated';

  constructor() {
    super('Invalid or expired refresh token');
  }
}

/**
 * Blocks the change that would leave an organization with no active admin —
 * nobody could then create accounts or restore access, and only a manual
 * database edit would recover the tenant.
 */
export class LastAdminException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor() {
    super('An organization must keep at least one active administrator');
  }
}

/** An admin tried to delete or deactivate their own account. */
export class SelfTargetedActionException extends DomainException {
  readonly kind: DomainErrorKind = 'conflict';

  constructor(action: string) {
    super(`You cannot ${action} your own account`);
  }
}

/** Invitation unknown, already accepted, expired, or for a disabled account. */
export class InvalidInvitationException extends DomainException {
  readonly kind: DomainErrorKind = 'unauthenticated';

  constructor() {
    super('This invitation link is no longer valid');
  }
}

/**
 * Self-registration is closed.
 *
 * `not-found` rather than `forbidden`: the route does not exist as far as a
 * caller is concerned, and saying "forbidden" would advertise that sign-up is a
 * thing this deployment could do. The kind carries that decision because the
 * answer *is* the point here — the message is written to read like Nest's own
 * 404 for a route that was never declared.
 */
export class RegistrationClosedException extends DomainException {
  readonly kind: DomainErrorKind = 'not-found';

  constructor() {
    super('Cannot POST /auth/register');
  }
}

const PASSWORD_RULE_MESSAGES: Record<PasswordRule, (minLength: number) => string> = {
  [PasswordRule.MIN_LENGTH]: (min) => `Password must be at least ${min} characters long`,
  [PasswordRule.UPPERCASE]: () => 'Password must contain an uppercase letter',
  [PasswordRule.LOWERCASE]: () => 'Password must contain a lowercase letter',
  [PasswordRule.DIGIT]: () => 'Password must contain a digit',
  [PasswordRule.SPECIAL]: () => 'Password must contain a special character',
  [PasswordRule.COMMON]: () =>
    'Password is too common — adding a digit or a symbol to a well-known password is not enough',
  [PasswordRule.CONTEXTUAL]: () =>
    'Password must not contain your name, your email or your organisation name',
};

/**
 * Reports **every** unmet rule at once, in the same `{ field, code, message }`
 * shape the global `ValidationPipe` produces. A form can therefore mark all the
 * failing criteria in one round-trip instead of revealing them one at a time,
 * and the `code` is an i18n key the client translates itself.
 */
export class WeakPasswordException extends DomainException {
  readonly kind: DomainErrorKind = 'invalid-input';

  constructor(violations: PasswordRule[], minLength: number) {
    const errors = violations.map((rule) => ({
      field: 'password',
      code: `form.errors.password.${rule}`,
      message: PASSWORD_RULE_MESSAGES[rule](minLength),
    }));

    super(errors[0]?.message ?? 'Password does not meet the security policy', errors);
  }
}
