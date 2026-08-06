import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultiTenantConfig } from '@config/multi-tenant.config';
import { TenantContext } from '../tenant/tenant-context';
import { PrismaService } from './prisma.service';
import {
  TENANT_PRISMA,
  TenantPrismaClient,
  buildTenantPrismaClient,
} from './tenant-prisma.client';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      // The client every repository should use: same connection pool as
      // `PrismaService` (an extended client wraps, it does not reconnect), with
      // the tenant filter applied on the way through.
      provide: TENANT_PRISMA,
      inject: [PrismaService, TenantContext, ConfigService],
      useFactory: (
        prisma: PrismaService,
        tenantContext: TenantContext,
        configService: ConfigService,
      ): TenantPrismaClient => {
        const { enabled } = configService.getOrThrow<MultiTenantConfig>('multiTenant');
        return buildTenantPrismaClient(prisma, tenantContext, { enabled });
      },
    },
  ],
  exports: [PrismaService, TENANT_PRISMA],
})
export class PrismaModule {}
