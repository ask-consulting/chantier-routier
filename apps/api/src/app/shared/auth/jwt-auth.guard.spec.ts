import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@chantia/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { TenantContext } from '../tenant/tenant-context';
import { AUTH_USER_KEY, RequestWithUser } from './authenticated-user';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * The front door of every business route, with a real `JwtService` and a real
 * `TenantContext`.
 *
 * Tokens are signed here with the same settings the identity context uses —
 * this side may not import it. That what `JwtTokenIssuer` signs is accepted
 * here is proved from the identity side, in `jwt-token-issuer.spec.ts`.
 */

const SECRET = 'test-only-secret-not-used-anywhere-else-7c1d';
const ISSUER = 'chantia-identity';

const jwt = new JwtService();
const configFor = (values: Record<string, unknown>) =>
  ({ getOrThrow: (key: string) => values[key] }) as unknown as ConfigService;

const CLAIMS = {
  sub: 'user-1',
  org: 'org-1',
  role: UserRole.SITE_MANAGER,
  email: 'chef@chantier.fr',
};

const issuer = {
  issueAccessToken: async (claims: typeof CLAIMS) => ({
    token: await jwt.signAsync(claims, {
      secret: SECRET,
      issuer: ISSUER,
      expiresIn: 300,
      algorithm: 'HS256',
    }),
  }),
};

function contextFor(
  request: Partial<RequestWithUser>,
  metadata: Record<string, unknown> = {},
): ExecutionContext {
  const handler = () => undefined;
  for (const [key, value] of Object.entries(metadata)) {
    Reflect.defineMetadata(key, value, handler);
  }
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const withAuthorization = (authorization: string | string[] | undefined) =>
  ({ headers: { authorization } }) as unknown as RequestWithUser;

describe('JwtAuthGuard', () => {
  let tenant: TenantContext;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    tenant = new TenantContext();
    guard = new JwtAuthGuard(
      new Reflector(),
      jwt,
      tenant,
      configFor({ auth: { accessTokenSecret: SECRET, issuer: ISSUER } }),
    );
  });

  it('accepts a valid token, and resolves the caller', async () => {
    const { token } = await issuer.issueAccessToken(CLAIMS);
    const request = withAuthorization(`Bearer ${token}`);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request[AUTH_USER_KEY]).toEqual({
      id: 'user-1',
      organizationId: 'org-1',
      role: UserRole.SITE_MANAGER,
      email: 'chef@chantier.fr',
    });
  });

  it('publishes the tenant for the rest of the request', async () => {
    const { token } = await issuer.issueAccessToken(CLAIMS);

    const seen = await tenant.run(async () => {
      await guard.canActivate(contextFor(withAuthorization(`Bearer ${token}`)));
      return tenant.current();
    });

    expect(seen).toBe('org-1');
  });

  it('reads the scheme in any casing', async () => {
    const { token } = await issuer.issueAccessToken(CLAIMS);

    await expect(
      guard.canActivate(contextFor(withAuthorization(`bearer ${token}`))),
    ).resolves.toBe(true);
  });

  it('lets a public route through without a token, and leaves the tenant unset', async () => {
    const request = withAuthorization(undefined);

    const seen = await tenant.run(async () => {
      await expect(
        guard.canActivate(contextFor(request, { [IS_PUBLIC_KEY]: true })),
      ).resolves.toBe(true);
      return tenant.current();
    });

    expect(seen).toBeNull();
    expect(request[AUTH_USER_KEY]).toBeUndefined();
  });

  it.each([
    ['no header', undefined],
    ['an empty header', ''],
    ['another scheme', 'Basic dXNlcjpwYXNz'],
    ['the scheme alone', 'Bearer'],
  ])('refuses %s with a 401', async (_label, header) => {
    await expect(guard.canActivate(contextFor(withAuthorization(header)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token signed with another secret', async () => {
    const forged = await jwt.signAsync(CLAIMS, { secret: 'someone-else', issuer: ISSUER });

    await expect(
      guard.canActivate(contextFor(withAuthorization(`Bearer ${forged}`))),
    ).rejects.toThrow('Invalid or expired access token');
  });

  it('refuses a token from another issuer, even signed with our secret', async () => {
    const foreign = await jwt.signAsync(CLAIMS, { secret: SECRET, issuer: 'not-chantia' });

    await expect(
      guard.canActivate(contextFor(withAuthorization(`Bearer ${foreign}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refuses an expired token with the same message as a forged one', async () => {
    // Telling "expired" from "malformed" would help someone probe the setup.
    const expired = await jwt.signAsync(
      { ...CLAIMS, iat: Math.floor(Date.now() / 1000) - 600 },
      { secret: SECRET, issuer: ISSUER, expiresIn: 60 },
    );

    await expect(
      guard.canActivate(contextFor(withAuthorization(`Bearer ${expired}`))),
    ).rejects.toThrow('Invalid or expired access token');
  });

  it('never publishes a tenant for a token it refused', async () => {
    const forged = await jwt.signAsync(CLAIMS, { secret: 'someone-else', issuer: ISSUER });

    const seen = await tenant.run(async () => {
      await guard
        .canActivate(contextFor(withAuthorization(`Bearer ${forged}`)))
        .catch(() => undefined);
      return tenant.current();
    });

    expect(seen).toBeNull();
  });
});
