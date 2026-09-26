import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { Permission, UserRole } from '@chantia/shared';
import { AUTH_USER_KEY } from './authenticated-user';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

/**
 * The two guards every route leans on, against the real role matrix.
 *
 * The case worth the most is the fleet's: writing a machine asks for
 * `equipment:manage` **and** `budget:manage`, and a role holding one of the two
 * must be refused — several permissions mean all of them.
 */

function contextFor(
  metadata: Record<string, unknown>,
  user?: { role: UserRole },
): ExecutionContext {
  const handler = () => undefined;
  for (const [key, value] of Object.entries(metadata)) {
    Reflect.defineMetadata(key, value, handler);
  }
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => (user ? { [AUTH_USER_KEY]: user } : {}) }),
  } as unknown as ExecutionContext;
}

const permissions = new PermissionsGuard(new Reflector());
const roles = new RolesGuard(new Reflector());

describe('PermissionsGuard', () => {
  it('lets through a route that asks for nothing', () => {
    expect(permissions.canActivate(contextFor({}))).toBe(true);
  });

  it('lets through a role holding every permission asked', () => {
    const context = contextFor(
      { [PERMISSIONS_KEY]: [Permission.EQUIPMENT_MANAGE, Permission.BUDGET_MANAGE] },
      { role: UserRole.SITE_MANAGER },
    );

    expect(permissions.canActivate(context)).toBe(true);
  });

  it('refuses a role missing one of them — all, not any', () => {
    const context = contextFor(
      { [PERMISSIONS_KEY]: [Permission.EQUIPMENT_READ, Permission.BUDGET_READ] },
      { role: UserRole.FOREMAN },
    );

    expect(() => permissions.canActivate(context)).toThrow(ForbiddenException);
  });

  it('refuses nobody with a 401, not a 403', () => {
    const context = contextFor({ [PERMISSIONS_KEY]: [Permission.WORKSITE_READ] });

    expect(() => permissions.canActivate(context)).toThrow(UnauthorizedException);
  });
});

describe('RolesGuard', () => {
  it('lets through a route that names no role, and a role it names', () => {
    expect(roles.canActivate(contextFor({}))).toBe(true);
    expect(
      roles.canActivate(contextFor({ [ROLES_KEY]: [UserRole.ADMIN] }, { role: UserRole.ADMIN })),
    ).toBe(true);
  });

  it('refuses another role, and nobody', () => {
    expect(() =>
      roles.canActivate(contextFor({ [ROLES_KEY]: [UserRole.ADMIN] }, { role: UserRole.WORKER })),
    ).toThrow(ForbiddenException);
    expect(() => roles.canActivate(contextFor({ [ROLES_KEY]: [UserRole.ADMIN] }))).toThrow(
      UnauthorizedException,
    );
  });
});
