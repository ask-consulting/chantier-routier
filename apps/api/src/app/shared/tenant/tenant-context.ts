import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  /** Tenant of the caller, or null when the request carries no access token. */
  organizationId: string | null;
  /** Set by `runUnscoped` to suspend the filter for one call — Doctrine's `disableFilter`. */
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
   * route (login, register, refresh), a background job, or a bypassed call.
   */
  current(): string | null {
    const store = this.storage.getStore();
    if (!store || store.bypassed) {
      return null;
    }
    return store.organizationId;
  }

  /**
   * Runs `callback` with the tenant filter suspended.
   *
   * For the deliberate cross-tenant read: housekeeping jobs, support tooling,
   * platform-wide statistics. Being a callback rather than a flag keeps the
   * un-filtered window visible and bounded at the call site.
   */
  runUnscoped<T>(callback: () => T): T {
    const store = this.storage.getStore();
    if (!store) {
      return callback();
    }
    return this.storage.run({ ...store, bypassed: true }, callback);
  }
}
