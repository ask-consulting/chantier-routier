import { AUTH_USER_KEY, RequestWithUser } from '../auth/authenticated-user';

/** What the rate limiter needs off an incoming request, and nothing more. */
export interface ThrottledRequest extends RequestWithUser {
  /** Peer address as Fastify saw it — the socket, not the header. */
  ip?: string;
  /** Parsed body. Guards run before the validation pipe, so this is raw input. */
  body?: unknown;
}

/** The throttler hands trackers an untyped bag; narrow it here, once. */
export function asThrottledRequest(req: Record<string, unknown>): ThrottledRequest {
  return req as unknown as ThrottledRequest;
}

const FORWARDED_FOR = 'x-forwarded-for';

/** Fail-closed bucket: an unattributable caller is limited, not waved through. */
const UNATTRIBUTED = 'unknown';

/** Longest address RFC 5321 allows. */
const MAX_EMAIL_LENGTH = 320;

/**
 * The caller's address, counting back through the proxies we actually trust.
 *
 * `X-Forwarded-For` grows left to right: each proxy *appends* the address that
 * connected to it. The left entries are therefore forgeable by the client, and
 * the rightmost `trustedProxyHops` are the ones our own edge wrote. Reading from
 * the right is what makes this unforgeable — take the leftmost entry, the
 * reflex, and every attempt claims a fresh address.
 */
export function resolveClientIp(req: ThrottledRequest, trustedProxyHops: number): string {
  const peer = req.ip ?? UNATTRIBUTED;
  if (trustedProxyHops <= 0) {
    return peer;
  }

  const header = req.headers[FORWARDED_FOR];
  const raw = Array.isArray(header) ? header.join(',') : header;
  if (!raw) {
    return peer;
  }

  const chain = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  // A chain shorter than advertised means a misconfigured hop count, or a
  // stripped header. Either way the peer address is the honest answer.
  return chain[chain.length - trustedProxyHops] ?? peer;
}

/**
 * Who the request is trying to authenticate as — the one thing an attacker
 * cannot rotate away from, since it is the target.
 *
 * Falls back to the authenticated account so a credential *change* is limited
 * per person too. Returns `null` when the route names nobody, which is the
 * signal to skip this limiter: bucketing every subject-less request together
 * would let traffic on `/auth/refresh` lock out `/auth/login`.
 */
export function resolveCredentialSubject(req: ThrottledRequest): string | null {
  const body: unknown = req.body;
  if (typeof body === 'object' && body !== null && 'email' in body) {
    const email: unknown = (body as { email: unknown }).email;
    // Raw body, so anything could be here: a non-string is not an identity.
    if (typeof email === 'string') {
      // Clamped rather than rejected, or padding the field would be the way
      // past this limiter.
      const normalized = email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
      if (normalized) {
        return `email:${normalized}`;
      }
    }
  }

  const caller = req[AUTH_USER_KEY];
  return caller ? `user:${caller.id}` : null;
}
