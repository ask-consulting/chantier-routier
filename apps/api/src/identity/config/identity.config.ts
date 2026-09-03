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
  /**
   * Where the web front is reachable, used to turn `invitationPath` into a link
   * somebody can click in an email.
   *
   * It lives here rather than in `app.config` because the context that mints the
   * link is the one that must know where it points — and it leaves with the
   * identity service the day it is extracted.
   */
  webAppUrl: string;
}

const FIVE_MINUTES = 5 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Where the invitation link points — and the one setting whose default is
 * *dangerous* in production rather than merely wrong.
 *
 * It fell back to `http://localhost:3000` everywhere, so a deployment that
 * forgot the variable sent perfectly well-formed invitation emails pointing at
 * the recipient's own machine. Nothing failed, nothing was logged: the account
 * was created, the mail left, and the link was dead on arrival. That happened on
 * 2 September 2026, and the only reason it was caught is that somebody clicked.
 *
 * So the default survives for development, where it is right, and production
 * refuses to boot without the real value. A crash on deploy is cheap; an
 * invitation that silently goes nowhere is not.
 */
function readWebAppUrl(): string {
  const configured = process.env.WEB_APP_URL?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'WEB_APP_URL is required in production — without it, invitation emails ' +
          'link to http://localhost:3000 and every invitation silently fails.',
      );
    }
    return 'http://localhost:3000';
  }

  return configured.replace(/\/+$/, '');
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
    // Trailing slash trimmed once here, so every caller can concatenate a path
    // that starts with one without producing `//invitation`.
    webAppUrl: readWebAppUrl(),
  }),
);
