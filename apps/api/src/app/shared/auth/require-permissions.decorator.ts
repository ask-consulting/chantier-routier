import { SetMetadata } from '@nestjs/common';
import { Permission } from '@chantia/shared';

export const PERMISSIONS_KEY = 'auth:permissions';

/**
 * Declares the capabilities a route needs. All of them are required.
 *
 *   @RequirePermissions(Permission.WORKSITE_MANAGE)
 *
 * Prefer this over `@Roles(...)`: it states *what the route does* rather than
 * who is currently allowed to do it, so re-balancing the roles is a one-line
 * change in `ROLE_PERMISSIONS`.
 */
export const RequirePermissions = (...permissions: Permission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
