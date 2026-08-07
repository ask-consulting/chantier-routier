import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AUTH_USER_KEY, AuthenticatedUser, RequestWithUser } from './authenticated-user';

/**
 * Injects the authenticated caller, or one of its fields:
 *
 *   findAll(@CurrentUser() user: AuthenticatedUser)
 *   findAll(@CurrentUser('organizationId') organizationId: string)
 *
 * Always populated on guarded routes — `JwtAuthGuard` rejects the request
 * otherwise, so handlers never have to null-check.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request[AUTH_USER_KEY];
    return field ? user?.[field] : user;
  },
);
