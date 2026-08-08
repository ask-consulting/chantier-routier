import { Locale } from '../enums/locale.enums';
import { UserRole } from '../enums/user.enums';

/**
 * Transport representation of a user account (API response, web/mobile cache).
 * Never carries the password hash.
 */
export interface IUser {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  /** Link to the HR worker record, when this account belongs to a field worker. */
  workerId: string | null;
  /** Interface language. Chosen by the user, not by the browser. */
  locale: Locale;
  /** False until the invitation has been accepted and a password set. */
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload for an admin inviting somebody into their organization.
 *
 * No password: the account is created without one, and the invitee sets their
 * own through the invitation link. An admin never knows their team's passwords.
 */
export interface ICreateUser {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  workerId?: string | null;
  locale?: Locale;
}

/** Payload to update an account. Email is immutable (it is the login identifier). */
export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  active?: boolean;
  workerId?: string | null;
}

/** Payload for a user changing their own interface language. */
export interface IUpdatePreferences {
  locale: Locale;
}

/** Payload for a user changing their own password. */
export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
}
