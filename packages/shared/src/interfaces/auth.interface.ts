import { UserRole } from '../enums/user.enums';
import { IUser } from './user.interface';

/** Sign-up payload — creates an organization together with its first admin user. */
export interface IRegisterRequest {
  organizationName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRefreshRequest {
  refreshToken: string;
}

export interface IAuthTokens {
  /** Short-lived JWT carrying the tenant + role claims. */
  accessToken: string;
  /** Opaque, single-use token rotated on every refresh. */
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

/** Response of register / login / refresh: tokens plus the authenticated profile. */
export interface IAuthSession extends IAuthTokens {
  user: IUser;
}

/** Claims encoded in the access token. Kept short — they travel on every request. */
export interface IAccessTokenClaims {
  /** User id. */
  sub: string;
  /** Organization (tenant) id. */
  org: string;
  role: UserRole;
  email: string;
}

/**
 * What an admin gets back after inviting somebody.
 *
 * The URL is returned rather than sent: delivery belongs to a notification
 * module that does not exist yet. Until it does, the admin copies the link and
 * passes it on by whatever channel suits — which is also why the API must not
 * assume email.
 */
export interface IInvitation {
  user: IUser;
  /** Path to hand over, e.g. `/invitation/aB3x…`. Shown once and never stored. */
  invitationPath: string;
  expiresAt: string;
}

/** What the invitation page shows before asking for a password. */
export interface IInvitationPreview {
  firstName: string;
  lastName: string;
  email: string;
  organizationName: string;
}

/** Payload for accepting an invitation: the token plus a chosen password. */
export interface IAcceptInvitation {
  token: string;
  password: string;
}
