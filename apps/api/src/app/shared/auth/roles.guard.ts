import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@chantia/shared';
import { AUTH_USER_KEY, RequestWithUser } from './authenticated-user';
import { ROLES_KEY } from './roles.decorator';

/**
 * Enforces `@Roles(...)`. Runs after `JwtAuthGuard`, which has already put the
 * caller on the request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request[AUTH_USER_KEY];
    if (!user) {
      // Only reachable if a route carries @Roles() together with @Public().
      throw new UnauthorizedException('Authentication required');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException(`Requires one of the following roles: ${required.join(', ')}`);
    }
    return true;
  }
}
