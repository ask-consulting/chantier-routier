import { Injectable, NestMiddleware } from '@nestjs/common';
import { TenantContext } from './tenant-context';

/**
 * Opens the tenant context for the whole request.
 *
 * Middleware, not an interceptor: middleware runs *before* the guards, so the
 * store already exists when `JwtAuthGuard` fills it in. An interceptor runs
 * after them and would be too late.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContext) {}

  use(_request: unknown, _response: unknown, next: () => void): void {
    this.tenantContext.run(() => next());
  }
}
