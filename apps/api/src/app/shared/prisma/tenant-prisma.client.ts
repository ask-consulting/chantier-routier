import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../tenant/tenant-context';
import { TenantExtensionOptions, tenantExtension } from './tenant.extension';

/**
 * Builds the tenant-filtered client.
 *
 * Same connection pool as the client it wraps — `$extends` layers behaviour, it
 * does not open a second connection, which matters on a free-tier pooler.
 */
export function buildTenantPrismaClient(
  base: PrismaClient,
  tenantContext: TenantContext,
  options: TenantExtensionOptions,
) {
  return base.$extends(tenantExtension(tenantContext, options));
}

/**
 * Type of the tenant-filtered client.
 *
 * Inferred from the builder rather than written by hand: an extended client is a
 * *different* type from `PrismaClient`, and inferring it keeps every model
 * delegate fully typed in the repositories.
 */
export type TenantPrismaClient = ReturnType<typeof buildTenantPrismaClient>;

/**
 * Injection token for the tenant-filtered client.
 *
 * A distinct token, not `PrismaService`, on purpose: seeing
 * `@Inject(TENANT_PRISMA)` in a repository says the queries below are scoped.
 * Reaching for `PrismaService` instead is then a visible, reviewable choice.
 */
export const TENANT_PRISMA = Symbol('TenantPrismaClient');
