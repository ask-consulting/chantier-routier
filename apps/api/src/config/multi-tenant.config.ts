import { registerAs } from '@nestjs/config';

/**
 * Master switch for the automatic tenant filter — the equivalent of Doctrine's
 * `getFilters()->enable('tenant')`, at process level.
 *
 * On by default: turning isolation off has to be a deliberate act, never the
 * consequence of a missing environment variable. Useful off for a data-migration
 * script or a support tool that legitimately reads across tenants; for a single
 * call inside a running API, prefer `TenantContext.runUnscoped()`, which keeps
 * the un-filtered window narrow and visible.
 */
export interface MultiTenantConfig {
  enabled: boolean;
}

export default registerAs(
  'multiTenant',
  (): MultiTenantConfig => ({
    enabled: process.env.MULTI_TENANT_ENABLED !== 'false',
  }),
);
