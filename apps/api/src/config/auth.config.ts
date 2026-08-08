import { registerAs } from '@nestjs/config';

/**
 * Access-token *verification* settings — the consumer half of authentication.
 *
 * This config deliberately holds no issuing parameters (token lifetimes, refresh
 * policy): the business API only ever verifies tokens minted by the identity
 * context. Once identity is extracted into its own service, this file is all the
 * business API keeps.
 */
export interface AuthConfig {
  /** HS256 secret shared with the identity service that signs the tokens. */
  accessTokenSecret: string;
  issuer: string;
}

/**
 * Read a required secret. Failing at boot is deliberate: a fallback default
 * would silently ship a publicly-known signing key to production.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }
  return value;
}

export const DEFAULT_JWT_ISSUER = 'chantia-identity';

export default registerAs(
  'auth',
  (): AuthConfig => ({
    accessTokenSecret: requireEnv('JWT_ACCESS_SECRET'),
    issuer: process.env.JWT_ISSUER ?? DEFAULT_JWT_ISSUER,
  }),
);
