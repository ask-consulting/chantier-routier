import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, roleHasEveryPermission } from '@chantia/shared';
import { AUTH_USER_KEY, RequestWithUser } from './authenticated-user';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

/**
 * Enforces `@RequirePermissions(...)`.
 *
 * Resolves the caller's capabilities from the role carried by the access token
 * through the shared `ROLE_PERMISSIONS` table — no database round-trip, so the
 * guard stays as stateless as `JwtAuthGuard` and travels with it.
 *
 * A permission grants a *verb*, not a *scope*: "may read timesheets" does not
 * say *which* timesheets. Narrowing rows to the caller's own data (or to their
 * tenant) is the query handler's job, never this guard's.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request[AUTH_USER_KEY];
    if (!user) {
      // Only reachable if a route carries @RequirePermissions() with @Public().
      throw new UnauthorizedException('Authentication required');
    }

    if (!roleHasEveryPermission(user.role, required)) {
      throw new ForbiddenException(`Missing permission: ${required.join(', ')}`);
    }
    return true;
  }
}
