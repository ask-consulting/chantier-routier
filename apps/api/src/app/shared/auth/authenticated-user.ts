import { UserRole } from '@chantia/shared';

/**
 * The caller, resolved from a verified access token.
 *
 * This is the *whole* contract between the business API and the identity
 * context: no database join, no repository call. Everything a business handler
 * needs about the caller travels inside the signed token.
 */
export interface AuthenticatedUser {
  id: string;
  /** Tenant the caller belongs to — the isolation key for every business query. */
  organizationId: string;
  role: UserRole;
  email: string;
}

/** Request property under which the guard stashes the resolved caller. */
export const AUTH_USER_KEY = 'authUser';

/** Shape of an incoming request once the guard has run. */
export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  [AUTH_USER_KEY]?: AuthenticatedUser;
}
