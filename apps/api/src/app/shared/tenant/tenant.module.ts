import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant-context';

/**
 * Global so the auth guard, the Prisma extension and any handler can reach the
 * same instance — there is exactly one `AsyncLocalStorage` for the process.
 */
@Global()
@Module({
  providers: [TenantContext],
  exports: [TenantContext],
})
export class TenantModule {}
