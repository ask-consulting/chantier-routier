import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '@config/app.config';
import authConfig from '@config/auth.config';
import multiTenantConfig from '@config/multi-tenant.config';
import { IdentityModule } from '@identity/identity.module';
import { AccessControlModule } from '@shared/auth';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { TenantContextMiddleware, TenantModule } from '@shared/tenant';
import { HealthModule } from './health/health.module';
import { WorksiteModule } from './worksite/worksite.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      load: [appConfig, authConfig, multiTenantConfig],
    }),
    // Must precede PrismaModule: the tenant-filtered client is built from it.
    TenantModule,
    PrismaModule,
    // Guards every route by default; a route opts out with `@Public()`.
    AccessControlModule,
    HealthModule,
    IdentityModule,
    WorksiteModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Middleware rather than an interceptor: it runs before the guards, so the
    // tenant store already exists when JwtAuthGuard fills it in.
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
