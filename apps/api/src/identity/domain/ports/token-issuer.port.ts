import { IAccessTokenClaims } from '@chantia/shared';

export interface IssuedAccessToken {
  token: string;
  /** Lifetime in seconds, for the client to schedule its refresh. */
  expiresIn: number;
}

export interface IssuedRefreshToken {
  /** Opaque secret handed to the client. Never persisted. */
  token: string;
  /** SHA-256 of `token` — this is what the database stores. */
  tokenHash: string;
  expiresAt: Date;
}

export interface TokenIssuerPort {
  issueAccessToken(claims: IAccessTokenClaims): Promise<IssuedAccessToken>;
  /** Mints a fresh opaque refresh token together with its hash. */
  issueRefreshToken(): IssuedRefreshToken;
  /** Hashes a client-supplied token so it can be looked up. */
  hashRefreshToken(token: string): string;
}

export const TOKEN_ISSUER_PORT = Symbol('TokenIssuerPort');
