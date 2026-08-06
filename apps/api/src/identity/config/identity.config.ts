import { registerAs } from '@nestjs/config';
import { DEFAULT_JWT_ISSUER, requireEnv } from '@config/auth.config';

/**
 * Token *issuing* settings — owned by the identity context alone.
 *
 * When identity is extracted into its own service, this config moves with it and
 * the business API keeps only `auth.config.ts` (verification).
 */
export interface IdentityConfig {
  /** HS256 signing secret. Verifiers must be configured with the same value. */
  accessTokenSecret: string;
  issuer: string;
  /** Access-token lifetime, seconds. Short: it cannot be revoked before expiry. */
  accessTokenTtl: number;
  /** Refresh-token lifetime, seconds. Long: mobile stays logged in in the field. */
  refreshTokenTtl: number;
  /** Minimum password length enforced at registration and password change. */
  minPasswordLength: number;
}

const FIFTEEN_MINUTES = 15 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default registerAs(
  'identity',
  (): IdentityConfig => ({
    accessTokenSecret: requireEnv('JWT_ACCESS_SECRET'),
    issuer: process.env.JWT_ISSUER ?? DEFAULT_JWT_ISSUER,
    accessTokenTtl: positiveInt(process.env.JWT_ACCESS_TTL, FIFTEEN_MINUTES),
    refreshTokenTtl: positiveInt(process.env.JWT_REFRESH_TTL, THIRTY_DAYS),
    minPasswordLength: positiveInt(process.env.MIN_PASSWORD_LENGTH, 10),
  }),
);
