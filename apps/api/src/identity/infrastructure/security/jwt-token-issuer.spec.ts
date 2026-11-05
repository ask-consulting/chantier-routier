import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@chantia/shared';
import { AUTH_USER_KEY, JwtAuthGuard } from '@shared/auth';
import { TenantContext } from '@shared/tenant';
import { describe, expect, it } from 'vitest';
import { JwtTokenIssuer } from './jwt-token-issuer';

/**
 * The issuing half of a session, with a real `JwtService` — and the business
 * API's `JwtAuthGuard` on the other end. The two live in different modules and
 * only meet in production; this is the one place that proves what one signs,
 * the other accepts.
 */

const SECRET = 'test-only-secret-not-used-anywhere-else-7c1d';
const config = {
  getOrThrow: () => ({
    accessTokenSecret: SECRET,
    issuer: 'chantia-identity',
    accessTokenTtl: 300,
    refreshTokenTtl: 3600,
    invitationTtl: 86_400,
  }),
} as unknown as ConfigService;

const jwt = new JwtService();
const issuer = new JwtTokenIssuer(jwt, config);

describe('JwtTokenIssuer', () => {
  it('signs the claims in HS256, with the issuer and a lifetime', async () => {
    const claims = { sub: 'user-1', org: 'org-1', role: UserRole.ADMIN, email: 'a@b.fr' };

    const { token, expiresIn } = await issuer.issueAccessToken(claims);
    const decoded = await jwt.verifyAsync(token, { secret: SECRET, issuer: 'chantia-identity' });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());

    expect(header.alg).toBe('HS256');
    expect(decoded).toMatchObject(claims);
    expect(decoded.exp - decoded.iat).toBe(300);
    expect(expiresIn).toBe(300);
  });

  it('signs what the business API guard accepts, claims intact', async () => {
    const { token } = await issuer.issueAccessToken({
      sub: 'user-1',
      org: 'org-1',
      role: UserRole.FOREMAN,
      email: 'chef@chantier.fr',
    });
    const guard = new JwtAuthGuard(
      new Reflector(),
      jwt,
      new TenantContext(),
      { getOrThrow: () => ({ accessTokenSecret: SECRET, issuer: 'chantia-identity' }) } as never,
    );
    const request = { headers: { authorization: `Bearer ${token}` } } as Record<string, unknown>;
    const context = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[AUTH_USER_KEY]).toEqual({
      id: 'user-1',
      organizationId: 'org-1',
      role: UserRole.FOREMAN,
      email: 'chef@chantier.fr',
    });
  });

  it('mints refresh tokens that are opaque, unique, and stored only as a hash', () => {
    const first = issuer.issueRefreshToken();
    const second = issuer.issueRefreshToken();

    expect(first.token).not.toBe(second.token);
    // 48 random bytes, base64url: nothing encoded, nothing to decode.
    expect(Buffer.from(first.token, 'base64url')).toHaveLength(48);
    expect(first.token.split('.')).toHaveLength(1);
    expect(first.tokenHash).toBe(issuer.hashToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it('gives each kind of opaque token its own lifetime', () => {
    const before = Date.now();

    const refresh = issuer.issueRefreshToken();
    const invitation = issuer.issueInvitationToken();

    expect(refresh.expiresAt.getTime() - before).toBeGreaterThanOrEqual(3600 * 1000);
    expect(refresh.expiresAt.getTime() - before).toBeLessThan(3601 * 1000);
    expect(invitation.expiresAt.getTime() - before).toBeGreaterThanOrEqual(86_400 * 1000);
    expect(invitation.expiresAt.getTime() - before).toBeLessThan(86_401 * 1000);
  });

  it('hashes deterministically — the lookup by hash depends on it', () => {
    expect(issuer.hashToken('abc')).toBe(issuer.hashToken('abc'));
    expect(issuer.hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
