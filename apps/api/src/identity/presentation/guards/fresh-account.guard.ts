import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_KEY, RequestWithUser } from '@shared/auth';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { AccountDisabledException } from '../../domain/exceptions/identity.exceptions';

/**
 * Re-reads the caller's account before letting them grant or change access.
 *
 * `JwtAuthGuard` is stateless by design: it trusts the token's claims and never
 * touches the database, which is what keeps this context liftable. The cost is
 * that a token is a photograph — a deactivated account keeps working until it
 * expires, five minutes at most.
 *
 * For reading a list of worksites, five minutes is nothing: the access ends when
 * the token does. For **granting access**, it is not. A deactivated
 * administrator could, inside that window, invite a fresh administrator and
 * hand themselves a permanent way back in. The effect outlives the token, which
 * is what makes those routes different in kind and not merely in degree.
 *
 * Why this lives in `identity/` and not next to `JwtAuthGuard`: the operations
 * that grant or change access are, by definition, this context's own. It reads
 * `app_users` — its own table — so nothing crosses a boundary, and on the day
 * identity becomes a service the guard leaves with it. The business API keeps
 * its stateless guard and makes no extra call.
 *
 * Applied at controller level rather than per route, deliberately: a new
 * account-management endpoint is then guarded because it exists, not because
 * somebody remembered. The price is a primary-key lookup on the read routes that
 * do not need one — a fair trade against silently missing a write route.
 */
@Injectable()
export class FreshAccountGuard implements CanActivate {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const caller = request[AUTH_USER_KEY];

    // Only reachable behind `JwtAuthGuard`, which runs first as a global guard.
    // No caller means the route is `@Public()` — nothing to keep fresh.
    if (!caller) {
      return true;
    }

    const user = await this.users.findById(caller.id);
    if (!user?.canAuthenticate()) {
      throw new AccountDisabledException();
    }
    return true;
  }
}
