import { describe, expect, it } from 'vitest';
import { UserRole } from '@chantia/shared';
import { AUTH_USER_KEY } from '../auth/authenticated-user';
import { ThrottledRequest, resolveClientIp, resolveCredentialSubject } from './trackers';

/**
 * Rate limiting is only worth what its tracker is worth: bucket on a value the
 * caller controls and every attempt lands somewhere fresh, so the ceiling is
 * never reached. These pin the two places that could quietly go that way —
 * reading the wrong end of `X-Forwarded-For`, and trusting an unshaped body.
 */

const PEER = '10.0.0.9';
const CLIENT = '203.0.113.7';

function aRequest(overrides: Partial<ThrottledRequest> = {}): ThrottledRequest {
  return { ip: PEER, headers: {}, ...overrides };
}

describe('resolveClientIp', () => {
  it('uses the peer address when no proxy is trusted', () => {
    const req = aRequest({ headers: { 'x-forwarded-for': CLIENT } });

    expect(resolveClientIp(req, 0)).toBe(PEER);
  });

  it('reads the entry our own proxy appended, not the one the caller sent', () => {
    // What an attacker sends: a forged address, hoping to pick their bucket.
    // What the edge does: append the address that actually connected to it.
    const req = aRequest({ headers: { 'x-forwarded-for': `1.2.3.4, ${CLIENT}` } });

    expect(resolveClientIp(req, 1)).toBe(CLIENT);
  });

  it('gives a forging caller the same bucket every time', () => {
    const first = aRequest({ headers: { 'x-forwarded-for': `9.9.9.1, ${CLIENT}` } });
    const second = aRequest({ headers: { 'x-forwarded-for': `9.9.9.2, ${CLIENT}` } });

    expect(resolveClientIp(first, 1)).toBe(resolveClientIp(second, 1));
  });

  it('counts back through several trusted hops', () => {
    const req = aRequest({ headers: { 'x-forwarded-for': `1.2.3.4, ${CLIENT}, 10.0.0.1` } });

    expect(resolveClientIp(req, 2)).toBe(CLIENT);
  });

  it('falls back to the peer when the chain is shorter than the hop count', () => {
    const req = aRequest({ headers: { 'x-forwarded-for': CLIENT } });

    expect(resolveClientIp(req, 3)).toBe(PEER);
  });

  it('falls back to the peer when the header is absent', () => {
    expect(resolveClientIp(aRequest(), 1)).toBe(PEER);
  });

  it('tolerates whitespace and a repeated header', () => {
    const req = aRequest({ headers: { 'x-forwarded-for': ['1.2.3.4', `  ${CLIENT}  `] } });

    expect(resolveClientIp(req, 1)).toBe(CLIENT);
  });

  it('still returns a bucket when the peer address is missing', () => {
    const req: ThrottledRequest = { headers: {} };

    expect(resolveClientIp(req, 0)).toBe('unknown');
  });
});

describe('resolveCredentialSubject', () => {
  it('buckets on the email being tried', () => {
    const req = aRequest({ body: { email: 'chef@chantia.fr', password: 'x' } });

    expect(resolveCredentialSubject(req)).toBe('email:chef@chantia.fr');
  });

  it('normalises case and padding into a single bucket', () => {
    const spaced = aRequest({ body: { email: '  Chef@Chantia.FR ' } });
    const plain = aRequest({ body: { email: 'chef@chantia.fr' } });

    expect(resolveCredentialSubject(spaced)).toBe(resolveCredentialSubject(plain));
  });

  it('clamps an over-long value instead of letting it escape the limiter', () => {
    const padded = aRequest({ body: { email: `${'a'.repeat(400)}@chantia.fr` } });
    const paddedMore = aRequest({ body: { email: `${'a'.repeat(500)}@chantia.fr` } });

    expect(resolveCredentialSubject(padded)).not.toBeNull();
    expect(resolveCredentialSubject(padded)).toBe(resolveCredentialSubject(paddedMore));
  });

  it('ignores a non-string email rather than trusting the raw body', () => {
    // Guards run before ValidationPipe, so the body is whatever was posted.
    expect(resolveCredentialSubject(aRequest({ body: { email: { $ne: null } } }))).toBeNull();
    expect(resolveCredentialSubject(aRequest({ body: { email: ['a@b.fr'] } }))).toBeNull();
    expect(resolveCredentialSubject(aRequest({ body: { email: '   ' } }))).toBeNull();
    expect(resolveCredentialSubject(aRequest({ body: 'not an object' }))).toBeNull();
  });

  it('falls back to the authenticated account, so a password change is limited too', () => {
    const req = aRequest({
      body: { currentPassword: 'x', newPassword: 'y' },
      [AUTH_USER_KEY]: {
        id: 'user-1',
        organizationId: 'org-1',
        role: UserRole.ADMIN,
        email: 'chef@chantia.fr',
      },
    });

    expect(resolveCredentialSubject(req)).toBe('user:user-1');
  });

  it('returns null when the request names nobody, so the limiter skips it', () => {
    // Token rotation and invitation preview: bucketing these together would let
    // one route's traffic lock out another's.
    expect(resolveCredentialSubject(aRequest({ body: { refreshToken: 'abc' } }))).toBeNull();
    expect(resolveCredentialSubject(aRequest())).toBeNull();
  });
});
