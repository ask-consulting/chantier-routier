import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@chantia/shared';

export const ROLES_KEY = 'auth:roles';

/**
 * Restricts a route to the listed roles. Without it a route is open to any
 * authenticated caller of the tenant.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
