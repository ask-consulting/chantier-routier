import { HttpException, HttpStatus } from '@nestjs/common';
import { PasswordRule } from '@chantia/shared';

/**
 * Wrong email *or* wrong password — deliberately the same error for both.
 * Distinguishing them turns the login endpoint into an account-enumeration
 * oracle.
 */
export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      {
        message: 'Invalid email or password',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/** Credentials were valid but the account has been deactivated. */
export class AccountDisabledException extends HttpException {
  constructor() {
    super(
      {
        message: 'This account has been deactivated',
        error: 'Forbidden',
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class EmailAlreadyUsedException extends HttpException {
  constructor(email: string) {
    super(
      {
        message: `An account already exists for ${email}`,
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  }
}

/** Refresh token unknown, expired, already rotated, or revoked. */
export class InvalidRefreshTokenException extends HttpException {
  constructor() {
    super(
      {
        message: 'Invalid or expired refresh token',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Blocks the change that would leave an organization with no active admin —
 * nobody could then create accounts or restore access, and only a manual
 * database edit would recover the tenant.
 */
export class LastAdminException extends HttpException {
  constructor() {
    super(
      {
        message: 'An organization must keep at least one active administrator',
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  }
}

/** An admin tried to delete or deactivate their own account. */
export class SelfTargetedActionException extends HttpException {
  constructor(action: string) {
    super(
      {
        message: `You cannot ${action} your own account`,
        error: 'Conflict',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  }
}

/** Invitation unknown, already accepted, expired, or for a disabled account. */
export class InvalidInvitationException extends HttpException {
  constructor() {
    super(
      {
        message: 'This invitation link is no longer valid',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Self-registration is closed.
 *
 * 404 rather than 403: the route does not exist as far as a caller is
 * concerned, and saying "forbidden" would advertise that sign-up is a thing this
 * deployment could do.
 */
export class RegistrationClosedException extends HttpException {
  constructor() {
    super(
      {
        message: 'Cannot POST /auth/register',
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    );
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
export class WeakPasswordException extends HttpException {
  constructor(violations: PasswordRule[], minLength: number) {
    const errors = violations.map((rule) => ({
      field: 'password',
      code: `form.errors.password.${rule}`,
      message: PASSWORD_RULE_MESSAGES[rule](minLength),
    }));

    super(
      {
        message: errors[0]?.message ?? 'Password does not meet the security policy',
        errors,
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
