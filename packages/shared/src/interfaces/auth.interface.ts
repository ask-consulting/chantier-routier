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
