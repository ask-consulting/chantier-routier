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
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload for an admin creating an account inside their own organization. */
export interface ICreateUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  workerId?: string | null;
}

/** Payload to update an account. Email is immutable (it is the login identifier). */
export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  active?: boolean;
  workerId?: string | null;
}

/** Payload for a user changing their own password. */
export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
}
