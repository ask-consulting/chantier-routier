import { HttpException, HttpStatus } from '@nestjs/common';

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

export class WeakPasswordException extends HttpException {
  constructor(minLength: number) {
    super(
      {
        message: `Password must be at least ${minLength} characters long`,
        errors: [
          {
            field: 'password',
            code: 'form.errors.password.minLength',
            message: `Password must be at least ${minLength} characters long`,
          },
        ],
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
