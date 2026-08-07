import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

/**
 * Access-token consumer kit: verifies incoming tokens and enforces access.
 *
 * Depends only on `@chantia/shared` (the wire contract) and `JWT_ACCESS_SECRET`
 * — never on the identity context's code or tables. When identity moves to its
 * own service, this folder is copied there verbatim so it can guard its own
 * routes too; nothing here needs to change.
 *
 * All three guards are global and run in order:
 *   1. `JwtAuthGuard`    — authentication. Routes are guarded unless `@Public()`.
 *   2. `PermissionsGuard` — `@RequirePermissions(...)`. The default way to guard
 *      a route: it names the capability, not the role that happens to hold it.
 *   3. `RolesGuard`      — `@Roles(...)`. Kept for the rare rule that is genuinely
 *      about *being* a role rather than being able to do something.
 *
 * A route with neither decorator is open to any authenticated member of a tenant.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule],
})
export class AccessControlModule {}
