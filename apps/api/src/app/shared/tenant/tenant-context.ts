import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  /** Tenant of the caller, or null when the request carries no access token. */
  organizationId: string | null;
  /** Set by `disable()` — the filter is suspended until `enable()` puts it back. */
  bypassed: boolean;
}

/**
 * Carries the current tenant across the async call stack, so a repository deep
 * in a handler can know it without every function in between passing it down.
 *
 * Uses Node's own `AsyncLocalStorage` — no dependency to add. The store is
 * created per request by `TenantContextMiddleware`, which runs before the guards,
 * and filled in by `JwtAuthGuard` once it has verified the token.
 */
@Injectable()
export class TenantContext {
  private readonly logger = new Logger(TenantContext.name);
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  /** Opens a fresh, empty context for one request. */
  run<T>(callback: () => T): T {
    return this.storage.run({ organizationId: null, bypassed: false }, callback);
  }

  /** Called by the auth guard once the access token is verified. */
  set(organizationId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.organizationId = organizationId;
    }
  }

  /**
   * The tenant to filter on, or `null` when there is none — an unauthenticated
   * route (login, register, refresh), a background job, or a disabled filter.
   */
  current(): string | null {
    const store = this.storage.getStore();
    if (!store || store.bypassed) {
      return null;
    }
    return store.organizationId;
  }

  /**
   * Suspends the tenant filter — the equivalent of Doctrine's
   * `$em->getFilters()->disable('tenant')`.
   *
   *   tenantContext.disable();
   *   const everyOrganisation = await prisma.worksite.findMany();
   *   tenantContext.enable();
   *
   * For the deliberate cross-tenant read: housekeeping jobs, support tooling,
   * platform-wide statistics.
   *
   * Scope is **the current request only**, because the store is created per
   * request. Forgetting `enable()` — or throwing in between — leaves the rest of
   * that one request unfiltered and cannot affect any other. Use `runUnscoped()`
   * when the block can throw and you want the restore guaranteed.
   */
  disable(): void {
    const store = this.storage.getStore();
    if (!store) {
      // Outside a request there is no tenant anyway, so the filter is already
      // off; saying so beats failing silently on a call that looks effective.
      this.logger.debug('disable() called outside a request — the filter was already off');
      return;
    }
    store.bypassed = true;
  }

  /** Puts the tenant filter back. Counterpart of `disable()`. */
  enable(): void {
    const store = this.storage.getStore();
    if (store) {
      store.bypassed = false;
    }
  }

  /** True when queries are currently being scoped to a tenant. */
  isEnabled(): boolean {
    return this.storage.getStore()?.bypassed === false;
  }

  /**
   * `disable()` / `enable()` around one block, with the restore guaranteed —
   * including when the block throws.
   *
   * Runs the callback in a *child* store rather than flipping the flag back in a
   * `finally`: a `finally` would fire the moment an async callback returns its
   * promise, long before the awaited work is done, and would put the filter back
   * mid-flight. `AsyncLocalStorage.run` covers the whole async continuation, and
   * leaves the outer store untouched — so nesting works too.
   */
  runUnscoped<T>(callback: () => T): T {
    const store = this.storage.getStore();
    if (!store) {
      return callback();
    }
    return this.storage.run({ ...store, bypassed: true }, callback);
  }
}
