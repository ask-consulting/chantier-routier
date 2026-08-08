import { IAccessTokenClaims } from '@chantia/shared';

export interface IssuedAccessToken {
  token: string;
  /** Lifetime in seconds, for the client to schedule its refresh. */
  expiresIn: number;
}

/**
 * An opaque secret handed to a client once, kept only as a hash.
 *
 * Used for refresh tokens and for invitations: same threat model — a string
 * that travels, must be revocable, and must be worthless in a database dump.
 */
export interface IssuedOpaqueToken {
  /** Opaque secret handed to the client. Never persisted. */
  token: string;
  /** SHA-256 of `token` — this is what the database stores. */
  tokenHash: string;
  expiresAt: Date;
}

export interface TokenIssuerPort {
  issueAccessToken(claims: IAccessTokenClaims): Promise<IssuedAccessToken>;
  /** Mints a fresh opaque refresh token together with its hash. */
  issueRefreshToken(): IssuedOpaqueToken;
  /** Mints an invitation token. Longer-lived: it travels by hand, not by client. */
  issueInvitationToken(): IssuedOpaqueToken;
  /** Hashes a caller-supplied opaque token so it can be looked up. */
  hashToken(token: string): string;
}

export const TOKEN_ISSUER_PORT = Symbol('TokenIssuerPort');
