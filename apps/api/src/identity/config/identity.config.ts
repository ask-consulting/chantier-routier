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
  /**
   * Access-token lifetime, seconds.
   *
   * Five minutes, and the number is load-bearing. The guard is stateless — it
   * never reads the database — so a token is a photograph taken at issue time:
   * a deactivated account, or one demoted from admin, keeps its old rights until
   * the token expires. This value *is* that window.
   *
   * Fifteen minutes was too long to sit between deciding to revoke somebody and
   * it taking effect. Shortening it costs one extra `/auth/refresh` every five
   * minutes per active session — nothing at this scale — and buys back two
   * thirds of the exposure without touching the architecture.
   */
  accessTokenTtl: number;
  /** Refresh-token lifetime, seconds. Long: mobile stays logged in in the field. */
  refreshTokenTtl: number;
  /** Minimum password length enforced at registration and password change. */
  minPasswordLength: number;
  /** Invitation lifetime, seconds. Long: the link travels by hand, not by client. */
  invitationTtl: number;
  /**
   * Whether `/auth/register` is open.
   *
   * Closed by default. The product currently serves a single organization, so
   * public sign-up would only ever create tenants nobody asked for — and an open
   * registration endpoint on a private back-office is a standing invitation.
   * Kept behind a flag rather than deleted: the code is written and tested, and
   * multi-tenant sign-up will want it back.
   */
  allowSelfRegistration: boolean;
}

const FIVE_MINUTES = 5 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default registerAs(
  'identity',
  (): IdentityConfig => ({
    accessTokenSecret: requireEnv('JWT_ACCESS_SECRET'),
    issuer: process.env.JWT_ISSUER ?? DEFAULT_JWT_ISSUER,
    accessTokenTtl: positiveInt(process.env.JWT_ACCESS_TTL, FIVE_MINUTES),
    refreshTokenTtl: positiveInt(process.env.JWT_REFRESH_TTL, THIRTY_DAYS),
    minPasswordLength: positiveInt(process.env.MIN_PASSWORD_LENGTH, 10),
    invitationTtl: positiveInt(process.env.INVITATION_TTL, SEVEN_DAYS),
    // Opt-in, never opt-out: a missing variable must not open registration.
    allowSelfRegistration: process.env.ALLOW_SELF_REGISTRATION === 'true',
  }),
);
