import { registerAs } from '@nestjs/config';

/**
 * Rate limiting on the authentication routes.
 *
 * Two windows, because they stop two different attacks: one caller trying many
 * passwords, and many addresses trying one account. The second is the one that
 * matters — a botnet rotates addresses for free, so an address-only limit
 * protects nothing.
 *
 * Neither replaces the password policy. They buy the time the policy needs.
 */
export interface ThrottlingConfig {
  /** Requests allowed per address, per `ipTtl`. */
  ipLimit: number;
  /** Address window, seconds. */
  ipTtl: number;
  /** Attempts allowed per email (or per account), per `identityTtl`. */
  identityLimit: number;
  /** Credential-subject window, seconds. */
  identityTtl: number;
  /**
   * How long a caller stays locked out once a limit is passed, seconds.
   *
   * Longer than the window on purpose: otherwise an attacker at the ceiling
   * waits for the oldest hit to age out and keeps going at exactly the limit.
   */
  blockDuration: number;
  /**
   * Number of reverse proxies we sit behind, and therefore trust.
   *
   * `0` — no proxy, the peer address is the client. The default, and the safe
   * one: reading `X-Forwarded-For` when nothing overwrites it lets any caller
   * pick their own bucket. `1` on Render, whose edge appends the real address.
   *
   * Wrong in the other direction is just as bad: left at `0` behind a proxy,
   * every request looks like the proxy and the first few callers lock out
   * everybody else.
   */
  trustedProxyHops: number;
}

const ONE_MINUTE = 60;
const FIFTEEN_MINUTES = 15 * 60;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export default registerAs(
  'throttling',
  (): ThrottlingConfig => ({
    ipLimit: positiveInt(process.env.THROTTLE_IP_LIMIT, 20),
    ipTtl: positiveInt(process.env.THROTTLE_IP_TTL, ONE_MINUTE),
    identityLimit: positiveInt(process.env.THROTTLE_IDENTITY_LIMIT, 10),
    identityTtl: positiveInt(process.env.THROTTLE_IDENTITY_TTL, FIFTEEN_MINUTES),
    blockDuration: positiveInt(process.env.THROTTLE_BLOCK_DURATION, FIFTEEN_MINUTES),
    trustedProxyHops: nonNegativeInt(process.env.TRUSTED_PROXY_HOPS, 0),
  }),
);
